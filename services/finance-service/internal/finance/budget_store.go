package finance

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrBudgetNotFound = errors.New("budget not found")

type BudgetStore struct {
	db   *pgxpool.Pool
	txns *TransactionStore
}

func NewBudgetStore(db *pgxpool.Pool) *BudgetStore {
	return &BudgetStore{db: db, txns: NewTransactionStore(db)}
}

func (s *BudgetStore) Migrate(ctx context.Context) error {
	_, err := s.db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS budgets (
			id UUID PRIMARY KEY,
			user_id TEXT NOT NULL,
			category TEXT NOT NULL,
			limit_amount DOUBLE PRECISION NOT NULL,
			month TEXT NOT NULL,
			rollover BOOLEAN NOT NULL DEFAULT false,
			last_alert_threshold INTEGER NOT NULL DEFAULT 0,
			UNIQUE (user_id, category, month)
		)
	`)
	return err
}

func (s *BudgetStore) Create(ctx context.Context, userID string, in BudgetInput) (*Budget, error) {
	var b Budget
	err := s.db.QueryRow(ctx, `
		INSERT INTO budgets (id, user_id, category, limit_amount, month, rollover, last_alert_threshold)
		VALUES ($1, $2, $3, $4, $5, $6, 0)
		RETURNING id, user_id, category, limit_amount, month, rollover, last_alert_threshold
	`, uuid.NewString(), userID, in.Category, in.LimitAmount, in.Month, in.Rollover).Scan(
		&b.ID, &b.UserID, &b.Category, &b.LimitAmount, &b.Month, &b.Rollover, &b.LastAlertThreshold,
	)
	if err != nil {
		return nil, err
	}
	return &b, nil
}

// List returns this user's budgets for the given month, each with Spent computed from that
// month's transactions. Applies rollover lazily: if a category has a rollover=true budget in
// the previous month but none yet for `month`, one is created here seeded with the previous
// month's unspent amount, before the list is returned.
func (s *BudgetStore) List(ctx context.Context, userID, month string) ([]Budget, error) {
	if err := s.applyRollovers(ctx, userID, month); err != nil {
		return nil, err
	}

	rows, err := s.db.Query(ctx, `
		SELECT id, user_id, category, limit_amount, month, rollover, last_alert_threshold
		FROM budgets WHERE user_id = $1 AND month = $2 ORDER BY category
	`, userID, month)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Budget
	for rows.Next() {
		var b Budget
		if err := rows.Scan(&b.ID, &b.UserID, &b.Category, &b.LimitAmount, &b.Month, &b.Rollover, &b.LastAlertThreshold); err != nil {
			return nil, err
		}
		spent, err := s.txns.SumForMonth(ctx, userID, b.Category, b.Month)
		if err != nil {
			return nil, err
		}
		b.Spent = spent
		out = append(out, b)
	}
	return out, rows.Err()
}

func (s *BudgetStore) Patch(ctx context.Context, id, userID string, in BudgetPatch) (*Budget, error) {
	var b Budget
	err := s.db.QueryRow(ctx, `
		UPDATE budgets SET
			limit_amount = COALESCE($1, limit_amount),
			rollover = COALESCE($2, rollover)
		WHERE id = $3 AND user_id = $4
		RETURNING id, user_id, category, limit_amount, month, rollover, last_alert_threshold
	`, in.LimitAmount, in.Rollover, id, userID).Scan(
		&b.ID, &b.UserID, &b.Category, &b.LimitAmount, &b.Month, &b.Rollover, &b.LastAlertThreshold,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrBudgetNotFound
		}
		return nil, err
	}
	return &b, nil
}

// ThresholdCrossing is returned by CheckThreshold when a transaction just pushed a budget
// past 80% or 100% for the first time this month.
type ThresholdCrossing struct {
	Budget    Budget
	Threshold int
}

// CheckThreshold recomputes spend for userID/category/month and, if it just crossed 80% or
// 100% (and hasn't already alerted at that threshold this month), persists the new threshold
// and returns the crossing so the caller can publish finance.budget.exceeded. Returns nil, nil
// if there's no budget for this category/month, or no new threshold was crossed.
func (s *BudgetStore) CheckThreshold(ctx context.Context, userID, category, month string) (*ThresholdCrossing, error) {
	var b Budget
	err := s.db.QueryRow(ctx, `
		SELECT id, user_id, category, limit_amount, month, rollover, last_alert_threshold
		FROM budgets WHERE user_id = $1 AND category = $2 AND month = $3
	`, userID, category, month).Scan(
		&b.ID, &b.UserID, &b.Category, &b.LimitAmount, &b.Month, &b.Rollover, &b.LastAlertThreshold,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	spent, err := s.txns.SumForMonth(ctx, userID, category, month)
	if err != nil {
		return nil, err
	}
	b.Spent = spent

	newThreshold := 0
	if b.LimitAmount > 0 {
		ratio := spent / b.LimitAmount
		if ratio >= 1.0 {
			newThreshold = 100
		} else if ratio >= 0.8 {
			newThreshold = 80
		}
	}

	if newThreshold <= b.LastAlertThreshold {
		return nil, nil
	}

	if _, err := s.db.Exec(ctx, `UPDATE budgets SET last_alert_threshold = $1 WHERE id = $2`, newThreshold, b.ID); err != nil {
		return nil, err
	}
	b.LastAlertThreshold = newThreshold

	return &ThresholdCrossing{Budget: b, Threshold: newThreshold}, nil
}

func (s *BudgetStore) applyRollovers(ctx context.Context, userID, month string) error {
	prev, err := previousMonth(month)
	if err != nil {
		return nil // unparseable month key — skip rollover, let List proceed with whatever exists
	}

	rows, err := s.db.Query(ctx, `
		SELECT id, category, limit_amount, rollover FROM budgets
		WHERE user_id = $1 AND month = $2 AND rollover = true
	`, userID, prev)
	if err != nil {
		return err
	}
	defer rows.Close()

	type prevBudget struct {
		id          string
		category    string
		limitAmount float64
	}
	var toRoll []prevBudget
	for rows.Next() {
		var pb prevBudget
		var rollover bool
		if err := rows.Scan(&pb.id, &pb.category, &pb.limitAmount, &rollover); err != nil {
			return err
		}
		toRoll = append(toRoll, pb)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	for _, pb := range toRoll {
		var exists bool
		if err := s.db.QueryRow(ctx, `
			SELECT EXISTS(SELECT 1 FROM budgets WHERE user_id = $1 AND category = $2 AND month = $3)
		`, userID, pb.category, month).Scan(&exists); err != nil {
			return err
		}
		if exists {
			continue
		}

		spent, err := s.txns.SumForMonth(ctx, userID, pb.category, prev)
		if err != nil {
			return err
		}
		unspent := pb.limitAmount - spent
		if unspent < 0 {
			unspent = 0
		}

		if _, err := s.db.Exec(ctx, `
			INSERT INTO budgets (id, user_id, category, limit_amount, month, rollover, last_alert_threshold)
			VALUES ($1, $2, $3, $4, $5, true, 0)
		`, uuid.NewString(), userID, pb.category, pb.limitAmount+unspent, month); err != nil {
			return err
		}
	}
	return nil
}

func previousMonth(month string) (string, error) {
	t, err := time.Parse("2006-01", month)
	if err != nil {
		return "", err
	}
	return t.AddDate(0, -1, 0).Format("2006-01"), nil
}
