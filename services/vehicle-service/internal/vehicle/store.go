package vehicle

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("vehicle not found")

type Store struct {
	db *pgxpool.Pool
}

func NewStore(db *pgxpool.Pool) *Store {
	return &Store{db: db}
}

func (s *Store) Migrate(ctx context.Context) error {
	_, err := s.db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS vehicles (
			id UUID PRIMARY KEY,
			user_id UUID NOT NULL,
			make TEXT NOT NULL,
			model TEXT NOT NULL,
			year INTEGER NOT NULL,
			plate_number TEXT NOT NULL,
			fuel_type TEXT NOT NULL,
			odometer DOUBLE PRECISION NOT NULL DEFAULT 0,
			photo_url TEXT NOT NULL DEFAULT '',
			is_primary BOOLEAN NOT NULL DEFAULT false,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`)
	return err
}

const vehicleColumns = `id, user_id, make, model, year, plate_number, fuel_type, odometer, photo_url, is_primary, eff, cost_per_km, estimated_range_km, created_at`

func scanVehicle(row pgx.Row) (*Vehicle, error) {
	var v Vehicle
	err := row.Scan(&v.ID, &v.UserID, &v.Make, &v.Model, &v.Year, &v.PlateNumber, &v.FuelType, &v.Odometer, &v.PhotoURL, &v.IsPrimary,
		&v.EfficiencyKmL, &v.CostPerKm, &v.EstimatedRangeKm, &v.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (s *Store) Create(ctx context.Context, id string, v Vehicle) (*Vehicle, error) {
	row := s.db.QueryRow(ctx, `
		INSERT INTO vehicles (id, user_id, make, model, year, plate_number, fuel_type, odometer, photo_url, is_primary)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING `+vehicleColumns,
		id, v.UserID, v.Make, v.Model, v.Year, v.PlateNumber, v.FuelType, v.Odometer, v.PhotoURL, v.IsPrimary,
	)
	return scanVehicle(row)
}

func (s *Store) ListByUser(ctx context.Context, userID string) ([]Vehicle, error) {
	rows, err := s.db.Query(ctx, `
		SELECT `+vehicleColumns+` FROM vehicles WHERE user_id = $1 ORDER BY created_at ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	vehicles := []Vehicle{}
	for rows.Next() {
		v, err := scanVehicle(rows)
		if err != nil {
			return nil, err
		}
		vehicles = append(vehicles, *v)
	}
	return vehicles, rows.Err()
}

func (s *Store) GetByID(ctx context.Context, userID, id string) (*Vehicle, error) {
	row := s.db.QueryRow(ctx, `
		SELECT `+vehicleColumns+` FROM vehicles WHERE id = $1 AND user_id = $2
	`, id, userID)
	v, err := scanVehicle(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return v, nil
}

func (s *Store) Update(ctx context.Context, userID, id string, v Vehicle) (*Vehicle, error) {
	row := s.db.QueryRow(ctx, `
		UPDATE vehicles
		SET make = $1, model = $2, year = $3, plate_number = $4, fuel_type = $5, odometer = $6, photo_url = $7
		WHERE id = $8 AND user_id = $9
		RETURNING `+vehicleColumns,
		v.Make, v.Model, v.Year, v.PlateNumber, v.FuelType, v.Odometer, v.PhotoURL, id, userID,
	)
	vh, err := scanVehicle(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return vh, nil
}

func (s *Store) Delete(ctx context.Context, userID, id string) error {
	tag, err := s.db.Exec(ctx, `DELETE FROM vehicles WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) SetPrimary(ctx context.Context, userID, id string) (*Vehicle, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `UPDATE vehicles SET is_primary = false WHERE user_id = $1 AND is_primary = true`, userID); err != nil {
		return nil, err
	}

	row := tx.QueryRow(ctx, `
		UPDATE vehicles SET is_primary = true WHERE id = $1 AND user_id = $2
		RETURNING `+vehicleColumns,
		id, userID,
	)
	v, err := scanVehicle(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return v, nil
}
