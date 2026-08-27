package finance

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ReportStore struct {
	db *pgxpool.Pool
}

func NewReportStore(db *pgxpool.Pool) *ReportStore {
	return &ReportStore{db: db}
}

type MonthlyReport struct {
	Month       string  `json:"month"`
	Income      float64 `json:"income"`
	Expenses    float64 `json:"expenses"`
	SavingsRate float64 `json:"savings_rate"`
}

func (s *ReportStore) Monthly(ctx context.Context, userID, month string) (*MonthlyReport, error) {
	var income, expenses float64
	err := s.db.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0),
			COALESCE(SUM(-amount) FILTER (WHERE amount < 0), 0)
		FROM transactions
		WHERE user_id = $1 AND to_char(occurred_at, 'YYYY-MM') = $2
	`, userID, month).Scan(&income, &expenses)
	if err != nil {
		return nil, err
	}

	savingsRate := 0.0
	if income > 0 {
		savingsRate = (income - expenses) / income
	}

	return &MonthlyReport{Month: month, Income: income, Expenses: expenses, SavingsRate: savingsRate}, nil
}

type CategoryBreakdown struct {
	Category string  `json:"category"`
	Amount   float64 `json:"amount"`
}

func (s *ReportStore) CategoryBreakdown(ctx context.Context, userID, month string) ([]CategoryBreakdown, error) {
	rows, err := s.db.Query(ctx, `
		SELECT category, SUM(-amount) AS amount FROM transactions
		WHERE user_id = $1 AND to_char(occurred_at, 'YYYY-MM') = $2 AND amount < 0
		GROUP BY category ORDER BY amount DESC
	`, userID, month)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []CategoryBreakdown
	for rows.Next() {
		var c CategoryBreakdown
		if err := rows.Scan(&c.Category, &c.Amount); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

type TrendPoint struct {
	Month    string  `json:"month"`
	Expenses float64 `json:"expenses"`
}

// Trend returns the last 6 months (including the given month) of total expenses.
func (s *ReportStore) Trend(ctx context.Context, userID, month string) ([]TrendPoint, error) {
	anchor, err := time.Parse("2006-01", month)
	if err != nil {
		return nil, err
	}

	var out []TrendPoint
	for i := 5; i >= 0; i-- {
		m := anchor.AddDate(0, -i, 0).Format("2006-01")
		var expenses float64
		if err := s.db.QueryRow(ctx, `
			SELECT COALESCE(SUM(-amount), 0) FROM transactions
			WHERE user_id = $1 AND to_char(occurred_at, 'YYYY-MM') = $2 AND amount < 0
		`, userID, m).Scan(&expenses); err != nil {
			return nil, err
		}
		out = append(out, TrendPoint{Month: m, Expenses: expenses})
	}
	return out, nil
}

type VehicleCostReport struct {
	Month string  `json:"month"`
	Total float64 `json:"total"`
}

// VehicleCost sums transactions tagged with a "vehicle:" source (see events.go) for the month
// — the Transport category as a whole may include non-vehicle manual entries too, so this
// filters specifically to vehicle-originated rows per the spec's vehicle cost report.
func (s *ReportStore) VehicleCost(ctx context.Context, userID, month string) (*VehicleCostReport, error) {
	var total float64
	err := s.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(-amount), 0) FROM transactions
		WHERE user_id = $1 AND to_char(occurred_at, 'YYYY-MM') = $2
			AND amount < 0 AND source LIKE 'vehicle:%'
	`, userID, month).Scan(&total)
	if err != nil {
		return nil, err
	}
	return &VehicleCostReport{Month: month, Total: total}, nil
}

type VehicleCategoryAmount struct {
	Category string  `json:"category"`
	Amount   float64 `json:"amount"`
}

// VehicleBreakdown groups vehicle-sourced spend by subtype (fuel/maintenance/insurance/...)
// for the month. The subtype is the third ':'-separated segment of source (see events.go),
// which pgx's split_part extracts directly — vehicle IDs are UUIDs and contain no colons, so
// this is unambiguous.
func (s *ReportStore) VehicleBreakdown(ctx context.Context, userID, month string) ([]VehicleCategoryAmount, error) {
	rows, err := s.db.Query(ctx, `
		SELECT split_part(source, ':', 3) AS category, SUM(-amount) AS amount
		FROM transactions
		WHERE user_id = $1 AND to_char(occurred_at, 'YYYY-MM') = $2
			AND amount < 0 AND source LIKE 'vehicle:%'
		GROUP BY split_part(source, ':', 3) ORDER BY amount DESC
	`, userID, month)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []VehicleCategoryAmount
	for rows.Next() {
		var v VehicleCategoryAmount
		if err := rows.Scan(&v.Category, &v.Amount); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}
