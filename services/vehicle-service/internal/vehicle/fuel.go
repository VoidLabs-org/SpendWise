package vehicle

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrFuelLogNotFound = errors.New("fuel log not found")

// efficiencyDropThreshold flags a fuel log when its efficiency falls more than 15% below
// the trailing average of the vehicle's last 3 prior entries.
const efficiencyDropThreshold = 0.15

type FuelLog struct {
	ID                     string    `json:"id"`
	VehicleID              string    `json:"vehicle_id"`
	Date                   time.Time `json:"date"`
	Litres                 float64   `json:"litres"`
	Cost                   float64   `json:"cost"`
	Odometer               float64   `json:"odometer"`
	Station                string    `json:"station"`
	EfficiencyKmL          float64   `json:"efficiency_km_l"`
	CostPerKm              float64   `json:"cost_per_km"`
	EstimatedRangeKm       float64   `json:"estimated_range_km"`
	EfficiencyDropDetected bool      `json:"efficiency_drop_detected"`
	CreatedAt              time.Time `json:"created_at"`
}

type FuelStore struct {
	db *pgxpool.Pool
}

func NewFuelStore(db *pgxpool.Pool) *FuelStore {
	return &FuelStore{db: db}
}

func (s *FuelStore) Migrate(ctx context.Context) error {
	if _, err := s.db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS fuel_logs (
			id UUID PRIMARY KEY,
			vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
			date TIMESTAMPTZ NOT NULL,
			litres DOUBLE PRECISION NOT NULL,
			cost DOUBLE PRECISION NOT NULL,
			odometer DOUBLE PRECISION NOT NULL,
			station TEXT NOT NULL DEFAULT '',
			efficiency_km_l DOUBLE PRECISION NOT NULL DEFAULT 0,
			cost_per_km DOUBLE PRECISION NOT NULL DEFAULT 0,
			estimated_range_km DOUBLE PRECISION NOT NULL DEFAULT 0,
			efficiency_drop_detected BOOLEAN NOT NULL DEFAULT false,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`); err != nil {
		return err
	}

	// Cached copies of the latest fuel-derived stats, read directly by the mobile Vehicle type.
	_, err := s.db.Exec(ctx, `
		ALTER TABLE vehicles
			ADD COLUMN IF NOT EXISTS eff DOUBLE PRECISION NOT NULL DEFAULT 0,
			ADD COLUMN IF NOT EXISTS cost_per_km DOUBLE PRECISION NOT NULL DEFAULT 0,
			ADD COLUMN IF NOT EXISTS estimated_range_km DOUBLE PRECISION NOT NULL DEFAULT 0
	`)
	return err
}

const fuelLogColumns = `id, vehicle_id, date, litres, cost, odometer, station, efficiency_km_l, cost_per_km, estimated_range_km, efficiency_drop_detected, created_at`

func scanFuelLog(row pgx.Row) (*FuelLog, error) {
	var f FuelLog
	err := row.Scan(&f.ID, &f.VehicleID, &f.Date, &f.Litres, &f.Cost, &f.Odometer, &f.Station,
		&f.EfficiencyKmL, &f.CostPerKm, &f.EstimatedRangeKm, &f.EfficiencyDropDetected, &f.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

// Create inserts a fuel log for vehicleID and recomputes efficiency/cost stats against the
// vehicle's previous fill-up (the closest prior entry by odometer reading).
//
// EstimatedRangeKm assumes this fill-up's litres represent a full tank, so range = litres *
// this fill's efficiency — a simple heuristic documented here since the schema has no tank
// capacity field to derive it from more precisely.
func (s *FuelStore) Create(ctx context.Context, id, vehicleID string, date time.Time, litres, cost, odometer float64, station string) (*FuelLog, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var prevOdo float64
	err = tx.QueryRow(ctx, `
		SELECT odometer FROM fuel_logs
		WHERE vehicle_id = $1 AND odometer < $2
		ORDER BY odometer DESC LIMIT 1
	`, vehicleID, odometer).Scan(&prevOdo)
	hasPrev := true
	if errors.Is(err, pgx.ErrNoRows) {
		hasPrev = false
	} else if err != nil {
		return nil, err
	}

	var efficiency, costPerKm, estimatedRange float64
	if hasPrev {
		distance := odometer - prevOdo
		if distance > 0 && litres > 0 {
			efficiency = distance / litres
			costPerKm = cost / distance
			estimatedRange = litres * efficiency
		}
	}

	dropDetected := false
	if efficiency > 0 {
		rows, err := tx.Query(ctx, `
			SELECT efficiency_km_l FROM fuel_logs
			WHERE vehicle_id = $1 AND efficiency_km_l > 0
			ORDER BY odometer DESC LIMIT 3
		`, vehicleID)
		if err != nil {
			return nil, err
		}
		var sum float64
		var count int
		for rows.Next() {
			var e float64
			if err := rows.Scan(&e); err != nil {
				rows.Close()
				return nil, err
			}
			sum += e
			count++
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return nil, err
		}
		if count > 0 {
			trailingAvg := sum / float64(count)
			if efficiency < trailingAvg*(1-efficiencyDropThreshold) {
				dropDetected = true
			}
		}
	}

	row := tx.QueryRow(ctx, `
		INSERT INTO fuel_logs (id, vehicle_id, date, litres, cost, odometer, station, efficiency_km_l, cost_per_km, estimated_range_km, efficiency_drop_detected)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING `+fuelLogColumns,
		id, vehicleID, date, litres, cost, odometer, station, efficiency, costPerKm, estimatedRange, dropDetected,
	)
	log, err := scanFuelLog(row)
	if err != nil {
		return nil, err
	}

	if efficiency > 0 {
		if _, err := tx.Exec(ctx, `
			UPDATE vehicles SET odometer = GREATEST(odometer, $1), eff = $2, cost_per_km = $3, estimated_range_km = $4
			WHERE id = $5
		`, odometer, efficiency, costPerKm, estimatedRange, vehicleID); err != nil {
			return nil, err
		}
	} else {
		if _, err := tx.Exec(ctx, `
			UPDATE vehicles SET odometer = GREATEST(odometer, $1) WHERE id = $2
		`, odometer, vehicleID); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return log, nil
}

func (s *FuelStore) ListByVehicle(ctx context.Context, userID, vehicleID string) ([]FuelLog, error) {
	rows, err := s.db.Query(ctx, `
		SELECT fuel_logs.id, fuel_logs.vehicle_id, fuel_logs.date, fuel_logs.litres, fuel_logs.cost,
			fuel_logs.odometer, fuel_logs.station, fuel_logs.efficiency_km_l, fuel_logs.cost_per_km,
			fuel_logs.estimated_range_km, fuel_logs.efficiency_drop_detected, fuel_logs.created_at
		FROM fuel_logs
		JOIN vehicles ON vehicles.id = fuel_logs.vehicle_id
		WHERE fuel_logs.vehicle_id = $1 AND vehicles.user_id = $2
		ORDER BY fuel_logs.date DESC, fuel_logs.odometer DESC
	`, vehicleID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	logs := []FuelLog{}
	for rows.Next() {
		f, err := scanFuelLog(rows)
		if err != nil {
			return nil, err
		}
		logs = append(logs, *f)
	}
	return logs, rows.Err()
}

func (s *FuelStore) Delete(ctx context.Context, userID, id string) error {
	tag, err := s.db.Exec(ctx, `
		DELETE FROM fuel_logs
		USING vehicles
		WHERE fuel_logs.vehicle_id = vehicles.id AND fuel_logs.id = $1 AND vehicles.user_id = $2
	`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrFuelLogNotFound
	}
	return nil
}
