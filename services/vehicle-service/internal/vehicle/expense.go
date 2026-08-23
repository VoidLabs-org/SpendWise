package vehicle

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrExpenseNotFound = errors.New("expense not found")

var validExpenseTypes = map[string]bool{
	"insurance":       true,
	"revenue_licence": true,
	"emission_test":   true,
	"parking":         true,
	"fine":            true,
	"repair":          true,
	"other":           true,
}

func IsValidExpenseType(t string) bool {
	return validExpenseTypes[t]
}

type VehicleExpense struct {
	ID        string    `json:"id"`
	VehicleID string    `json:"vehicle_id"`
	Type      string    `json:"type"`
	Amount    float64   `json:"amount"`
	Date      time.Time `json:"date"`
	Note      string    `json:"note"`
	CreatedAt time.Time `json:"created_at"`
}

type ExpenseStore struct {
	db *pgxpool.Pool
}

func NewExpenseStore(db *pgxpool.Pool) *ExpenseStore {
	return &ExpenseStore{db: db}
}

func (s *ExpenseStore) Migrate(ctx context.Context) error {
	_, err := s.db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS vehicle_expenses (
			id UUID PRIMARY KEY,
			vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
			type TEXT NOT NULL,
			amount DOUBLE PRECISION NOT NULL,
			date TIMESTAMPTZ NOT NULL,
			note TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`)
	return err
}

const expenseColumns = `id, vehicle_id, type, amount, date, note, created_at`

func scanExpense(row pgx.Row) (*VehicleExpense, error) {
	var e VehicleExpense
	err := row.Scan(&e.ID, &e.VehicleID, &e.Type, &e.Amount, &e.Date, &e.Note, &e.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (s *ExpenseStore) Create(ctx context.Context, id, vehicleID string, e VehicleExpense) (*VehicleExpense, error) {
	row := s.db.QueryRow(ctx, `
		INSERT INTO vehicle_expenses (id, vehicle_id, type, amount, date, note)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING `+expenseColumns,
		id, vehicleID, e.Type, e.Amount, e.Date, e.Note,
	)
	return scanExpense(row)
}

func (s *ExpenseStore) ListByVehicle(ctx context.Context, userID, vehicleID string) ([]VehicleExpense, error) {
	rows, err := s.db.Query(ctx, `
		SELECT ve.id, ve.vehicle_id, ve.type, ve.amount, ve.date, ve.note, ve.created_at
		FROM vehicle_expenses ve
		JOIN vehicles v ON v.id = ve.vehicle_id
		WHERE ve.vehicle_id = $1 AND v.user_id = $2
		ORDER BY ve.date DESC
	`, vehicleID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	expenses := []VehicleExpense{}
	for rows.Next() {
		e, err := scanExpense(rows)
		if err != nil {
			return nil, err
		}
		expenses = append(expenses, *e)
	}
	return expenses, rows.Err()
}

func (s *ExpenseStore) Delete(ctx context.Context, userID, id string) error {
	tag, err := s.db.Exec(ctx, `
		DELETE FROM vehicle_expenses
		USING vehicles
		WHERE vehicle_expenses.vehicle_id = vehicles.id AND vehicle_expenses.id = $1 AND vehicles.user_id = $2
	`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrExpenseNotFound
	}
	return nil
}
