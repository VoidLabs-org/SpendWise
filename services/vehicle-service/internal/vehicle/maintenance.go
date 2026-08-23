package vehicle

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrMaintenanceLogNotFound = errors.New("maintenance log not found")

type MaintenanceLog struct {
	ID              string    `json:"id"`
	VehicleID       string    `json:"vehicle_id"`
	ServiceName     string    `json:"service_name"`
	Date            time.Time `json:"date"`
	Odometer        float64   `json:"odometer"`
	Cost            float64   `json:"cost"`
	NextDueDate     time.Time `json:"next_due_date"`
	NextDueOdometer float64   `json:"next_due_odometer"`
	ReceiptURL      string    `json:"receipt_url"`
	CreatedAt       time.Time `json:"created_at"`
}

type MaintenanceStore struct {
	db *pgxpool.Pool
}

func NewMaintenanceStore(db *pgxpool.Pool) *MaintenanceStore {
	return &MaintenanceStore{db: db}
}

func (s *MaintenanceStore) Migrate(ctx context.Context) error {
	_, err := s.db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS maintenance_logs (
			id UUID PRIMARY KEY,
			vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
			service_name TEXT NOT NULL,
			date TIMESTAMPTZ NOT NULL,
			odometer DOUBLE PRECISION NOT NULL,
			cost DOUBLE PRECISION NOT NULL,
			next_due_date TIMESTAMPTZ,
			next_due_odometer DOUBLE PRECISION,
			receipt_url TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`)
	return err
}

const maintenanceLogColumns = `id, vehicle_id, service_name, date, odometer, cost, next_due_date, next_due_odometer, receipt_url, created_at`

func scanMaintenanceLog(row pgx.Row) (*MaintenanceLog, error) {
	var m MaintenanceLog
	var nextDueDate *time.Time
	var nextDueOdometer *float64
	err := row.Scan(&m.ID, &m.VehicleID, &m.ServiceName, &m.Date, &m.Odometer, &m.Cost,
		&nextDueDate, &nextDueOdometer, &m.ReceiptURL, &m.CreatedAt)
	if err != nil {
		return nil, err
	}
	if nextDueDate != nil {
		m.NextDueDate = *nextDueDate
	}
	if nextDueOdometer != nil {
		m.NextDueOdometer = *nextDueOdometer
	}
	return &m, nil
}

func (s *MaintenanceStore) Create(ctx context.Context, id, vehicleID string, m MaintenanceLog) (*MaintenanceLog, error) {
	var nextDueDate *time.Time
	if !m.NextDueDate.IsZero() {
		nextDueDate = &m.NextDueDate
	}
	var nextDueOdometer *float64
	if m.NextDueOdometer != 0 {
		nextDueOdometer = &m.NextDueOdometer
	}

	row := s.db.QueryRow(ctx, `
		INSERT INTO maintenance_logs (id, vehicle_id, service_name, date, odometer, cost, next_due_date, next_due_odometer, receipt_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING `+maintenanceLogColumns,
		id, vehicleID, m.ServiceName, m.Date, m.Odometer, m.Cost, nextDueDate, nextDueOdometer, m.ReceiptURL,
	)
	return scanMaintenanceLog(row)
}

func (s *MaintenanceStore) ListByVehicle(ctx context.Context, userID, vehicleID string) ([]MaintenanceLog, error) {
	rows, err := s.db.Query(ctx, `
		SELECT ml.id, ml.vehicle_id, ml.service_name, ml.date, ml.odometer, ml.cost,
			ml.next_due_date, ml.next_due_odometer, ml.receipt_url, ml.created_at
		FROM maintenance_logs ml
		JOIN vehicles v ON v.id = ml.vehicle_id
		WHERE ml.vehicle_id = $1 AND v.user_id = $2
		ORDER BY ml.date DESC
	`, vehicleID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	logs := []MaintenanceLog{}
	for rows.Next() {
		m, err := scanMaintenanceLog(rows)
		if err != nil {
			return nil, err
		}
		logs = append(logs, *m)
	}
	return logs, rows.Err()
}

func (s *MaintenanceStore) Delete(ctx context.Context, userID, id string) error {
	tag, err := s.db.Exec(ctx, `
		DELETE FROM maintenance_logs
		USING vehicles
		WHERE maintenance_logs.vehicle_id = vehicles.id AND maintenance_logs.id = $1 AND vehicles.user_id = $2
	`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrMaintenanceLogNotFound
	}
	return nil
}
