package vehicle

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// DataStore backs the "clear all data" endpoint — a permanent, irreversible wipe of everything
// this service owns for one user.
type DataStore struct {
	db *pgxpool.Pool
}

func NewDataStore(db *pgxpool.Pool) *DataStore {
	return &DataStore{db: db}
}

// ClearAll deletes every vehicle owned by userID. fuel_logs/maintenance_logs/vehicle_expenses/
// reminders all reference vehicles with ON DELETE CASCADE, so deleting the vehicles is enough —
// no need to delete children explicitly.
func (s *DataStore) ClearAll(ctx context.Context, userID string) error {
	_, err := s.db.Exec(ctx, "DELETE FROM vehicles WHERE user_id = $1", userID)
	return err
}
