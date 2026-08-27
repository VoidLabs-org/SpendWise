package finance

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrRecurringNotFound = errors.New("recurring transaction not found")

type RecurringTransactionStore struct {
	db   *pgxpool.Pool
	txns *TransactionStore
}

func NewRecurringTransactionStore(db *pgxpool.Pool, txns *TransactionStore) *RecurringTransactionStore {
	return &RecurringTransactionStore{db: db, txns: txns}
}

func (s *RecurringTransactionStore) Migrate(ctx context.Context) error {
	_, err := s.db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS recurring_transactions (
			id UUID PRIMARY KEY,
			user_id TEXT NOT NULL,
			amount DOUBLE PRECISION NOT NULL,
			category TEXT NOT NULL,
			note TEXT NOT NULL DEFAULT '',
			photo_url TEXT NOT NULL DEFAULT '',
			frequency TEXT NOT NULL,
			next_occurrence TIMESTAMPTZ NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`)
	return err
}

// Create inserts the template and immediately generates its first occurrence as a real
// Transaction, tagged source = "recurring:<id>" (same convention as vehicle-sourced
// transactions), then sets next_occurrence to the *second* occurrence. Returns the template
// and the first generated Transaction so the caller can publish/threshold-check it.
func (s *RecurringTransactionStore) Create(ctx context.Context, userID string, in RecurringTransactionInput) (*RecurringTransaction, *Transaction, error) {
	next, err := advance(time.Now().UTC(), in.Frequency)
	if err != nil {
		return nil, nil, err
	}

	id := uuid.NewString()
	var rt RecurringTransaction
	err = s.db.QueryRow(ctx, `
		INSERT INTO recurring_transactions (id, user_id, amount, category, note, photo_url, frequency, next_occurrence)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, user_id, amount, category, note, photo_url, frequency, next_occurrence, created_at
	`, id, userID, in.Amount, in.Category, in.Note, in.PhotoURL, in.Frequency, next).Scan(
		&rt.ID, &rt.UserID, &rt.Amount, &rt.Category, &rt.Note, &rt.PhotoURL, &rt.Frequency, &rt.NextOccurrence, &rt.CreatedAt,
	)
	if err != nil {
		return nil, nil, err
	}

	source := "recurring:" + rt.ID
	first, err := s.txns.Create(ctx, userID, TransactionInput{
		Amount:   in.Amount,
		Category: in.Category,
		Note:     in.Note,
		PhotoURL: in.PhotoURL,
	}, &source)
	if err != nil {
		return nil, nil, err
	}

	return &rt, first, nil
}

func (s *RecurringTransactionStore) List(ctx context.Context, userID string) ([]RecurringTransaction, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, user_id, amount, category, note, photo_url, frequency, next_occurrence, created_at
		FROM recurring_transactions WHERE user_id = $1 ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []RecurringTransaction
	for rows.Next() {
		var rt RecurringTransaction
		if err := rows.Scan(&rt.ID, &rt.UserID, &rt.Amount, &rt.Category, &rt.Note, &rt.PhotoURL, &rt.Frequency, &rt.NextOccurrence, &rt.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, rt)
	}
	return out, rows.Err()
}

// Delete cancels the template. Transactions it already generated are untouched — same as
// deleting a vehicle reminder doesn't undo reminders already fired.
func (s *RecurringTransactionStore) Delete(ctx context.Context, id, userID string) error {
	tag, err := s.db.Exec(ctx, `DELETE FROM recurring_transactions WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrRecurringNotFound
	}
	return nil
}

// DueForGeneration returns every template whose next_occurrence has passed.
func (s *RecurringTransactionStore) DueForGeneration(ctx context.Context) ([]RecurringTransaction, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, user_id, amount, category, note, photo_url, frequency, next_occurrence, created_at
		FROM recurring_transactions WHERE next_occurrence <= now()
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []RecurringTransaction
	for rows.Next() {
		var rt RecurringTransaction
		if err := rows.Scan(&rt.ID, &rt.UserID, &rt.Amount, &rt.Category, &rt.Note, &rt.PhotoURL, &rt.Frequency, &rt.NextOccurrence, &rt.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, rt)
	}
	return out, rows.Err()
}

// GenerateOccurrence creates a real Transaction for a due template and advances its
// next_occurrence by one frequency step.
func (s *RecurringTransactionStore) GenerateOccurrence(ctx context.Context, rt RecurringTransaction) (*Transaction, error) {
	source := "recurring:" + rt.ID
	t, err := s.txns.Create(ctx, rt.UserID, TransactionInput{
		Amount:   rt.Amount,
		Category: rt.Category,
		Note:     rt.Note,
		PhotoURL: rt.PhotoURL,
	}, &source)
	if err != nil {
		return nil, err
	}

	next, err := advance(rt.NextOccurrence, rt.Frequency)
	if err != nil {
		return nil, err
	}
	if _, err := s.db.Exec(ctx, `UPDATE recurring_transactions SET next_occurrence = $1 WHERE id = $2`, next, rt.ID); err != nil {
		return nil, err
	}

	return t, nil
}

func advance(from time.Time, frequency string) (time.Time, error) {
	switch frequency {
	case "daily":
		return from.AddDate(0, 0, 1), nil
	case "weekly":
		return from.AddDate(0, 0, 7), nil
	case "monthly":
		return from.AddDate(0, 1, 0), nil
	default:
		return time.Time{}, fmt.Errorf("unknown frequency %q", frequency)
	}
}
