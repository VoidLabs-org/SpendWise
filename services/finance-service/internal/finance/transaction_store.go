package finance

import (
	"context"
	"errors"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrTransactionNotFound = errors.New("transaction not found")

type TransactionStore struct {
	db *pgxpool.Pool
}

func NewTransactionStore(db *pgxpool.Pool) *TransactionStore {
	return &TransactionStore{db: db}
}

func (s *TransactionStore) Migrate(ctx context.Context) error {
	_, err := s.db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS transactions (
			id UUID PRIMARY KEY,
			user_id TEXT NOT NULL,
			amount DOUBLE PRECISION NOT NULL,
			category TEXT NOT NULL,
			note TEXT NOT NULL DEFAULT '',
			photo_url TEXT NOT NULL DEFAULT '',
			source TEXT,
			occurred_at TIMESTAMPTZ NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);
		CREATE INDEX IF NOT EXISTS idx_transactions_user_category_occurred
			ON transactions (user_id, category, occurred_at);
		ALTER TABLE transactions ADD COLUMN IF NOT EXISTS photo_url TEXT NOT NULL DEFAULT '';
	`)
	return err
}

// TransactionFilter narrows List by optional category and date range — all fields optional.
type TransactionFilter struct {
	Category string
	From     *time.Time
	To       *time.Time
}

func (s *TransactionStore) Create(ctx context.Context, userID string, in TransactionInput, source *string) (*Transaction, error) {
	occurredAt := time.Now().UTC()
	if in.OccurredAt != nil {
		occurredAt = *in.OccurredAt
	}

	var t Transaction
	err := s.db.QueryRow(ctx, `
		INSERT INTO transactions (id, user_id, amount, category, note, photo_url, source, occurred_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, user_id, amount, category, note, photo_url, source, occurred_at, created_at
	`, uuid.NewString(), userID, in.Amount, in.Category, in.Note, in.PhotoURL, source, occurredAt).Scan(
		&t.ID, &t.UserID, &t.Amount, &t.Category, &t.Note, &t.PhotoURL, &t.Source, &t.OccurredAt, &t.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (s *TransactionStore) List(ctx context.Context, userID string, filter TransactionFilter) ([]Transaction, error) {
	query := `
		SELECT id, user_id, amount, category, note, photo_url, source, occurred_at, created_at
		FROM transactions WHERE user_id = $1
	`
	args := []any{userID}

	if filter.Category != "" {
		args = append(args, filter.Category)
		query += " AND category = $" + strconv.Itoa(len(args))
	}
	if filter.From != nil {
		args = append(args, *filter.From)
		query += " AND occurred_at >= $" + strconv.Itoa(len(args))
	}
	if filter.To != nil {
		args = append(args, *filter.To)
		query += " AND occurred_at <= $" + strconv.Itoa(len(args))
	}
	query += " ORDER BY occurred_at DESC"

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Transaction
	for rows.Next() {
		var t Transaction
		if err := rows.Scan(&t.ID, &t.UserID, &t.Amount, &t.Category, &t.Note, &t.PhotoURL, &t.Source, &t.OccurredAt, &t.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (s *TransactionStore) Update(ctx context.Context, id, userID string, in TransactionInput) (*Transaction, error) {
	occurredAt := time.Now().UTC()
	if in.OccurredAt != nil {
		occurredAt = *in.OccurredAt
	}

	var t Transaction
	err := s.db.QueryRow(ctx, `
		UPDATE transactions SET amount = $1, category = $2, note = $3, photo_url = $4, occurred_at = $5
		WHERE id = $6 AND user_id = $7
		RETURNING id, user_id, amount, category, note, photo_url, source, occurred_at, created_at
	`, in.Amount, in.Category, in.Note, in.PhotoURL, occurredAt, id, userID).Scan(
		&t.ID, &t.UserID, &t.Amount, &t.Category, &t.Note, &t.PhotoURL, &t.Source, &t.OccurredAt, &t.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTransactionNotFound
		}
		return nil, err
	}
	return &t, nil
}

func (s *TransactionStore) Delete(ctx context.Context, id, userID string) error {
	tag, err := s.db.Exec(ctx, `DELETE FROM transactions WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrTransactionNotFound
	}
	return nil
}

// SumForMonth returns the total of a category's transactions within the given month
// (YYYY-MM), used by BudgetStore to compute `spent`.
func (s *TransactionStore) SumForMonth(ctx context.Context, userID, category, month string) (float64, error) {
	var sum float64
	err := s.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(-amount), 0) FROM transactions
		WHERE user_id = $1 AND category = $2 AND to_char(occurred_at, 'YYYY-MM') = $3 AND amount < 0
	`, userID, category, month).Scan(&sum)
	return sum, err
}
