package finance

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// DataStore backs the "clear all data" endpoint — a permanent, irreversible wipe of everything
// this service owns for one user. Kept separate from the per-resource stores since it doesn't
// belong to any single resource.
type DataStore struct {
	db *pgxpool.Pool
}

func NewDataStore(db *pgxpool.Pool) *DataStore {
	return &DataStore{db: db}
}

// ClearAll deletes every transaction, recurring template, and budget for userID, plus their
// custom categories (user_id IS NOT NULL — the global defaults are never touched). Runs in a
// single transaction so a failure partway through doesn't leave a half-wiped account.
func (s *DataStore) ClearAll(ctx context.Context, userID string) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tables := []string{"transactions", "recurring_transactions", "budgets"}
	for _, table := range tables {
		if _, err := tx.Exec(ctx, "DELETE FROM "+table+" WHERE user_id = $1", userID); err != nil {
			return err
		}
	}
	if _, err := tx.Exec(ctx, "DELETE FROM categories WHERE user_id = $1", userID); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
