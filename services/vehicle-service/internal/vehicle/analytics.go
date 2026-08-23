package vehicle

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type CostEntry struct {
	Date         time.Time `json:"date"`
	Category     string    `json:"category"`
	Amount       float64   `json:"amount"`
	RunningTotal float64   `json:"running_total"`
}

type CostOfOwnership struct {
	Total   float64     `json:"total"`
	Entries []CostEntry `json:"entries"`
}

type MonthlyBreakdown struct {
	Month       string  `json:"month"`
	Fuel        float64 `json:"fuel"`
	Maintenance float64 `json:"maintenance"`
	Other       float64 `json:"other"`
	Total       float64 `json:"total"`
}

type EfficiencyPoint struct {
	Date          time.Time `json:"date"`
	EfficiencyKmL float64   `json:"efficiency_km_l"`
}

type VehicleCostSummary struct {
	VehicleID       string  `json:"vehicle_id"`
	Make            string  `json:"make"`
	Model           string  `json:"model"`
	FuelCost        float64 `json:"fuel_cost"`
	MaintenanceCost float64 `json:"maintenance_cost"`
	ExpenseCost     float64 `json:"expense_cost"`
	TotalCost       float64 `json:"total_cost"`
}

type AnalyticsStore struct {
	db *pgxpool.Pool
}

func NewAnalyticsStore(db *pgxpool.Pool) *AnalyticsStore {
	return &AnalyticsStore{db: db}
}

// CostOfOwnership merges fuel, maintenance, and other-expense costs for vehicleID into a
// single running total, ordered oldest first. category is "fuel", "maintenance", or the
// expense's own type (e.g. "insurance") for finer-grained display.
func (s *AnalyticsStore) CostOfOwnership(ctx context.Context, userID, vehicleID string) (*CostOfOwnership, error) {
	rows, err := s.db.Query(ctx, `
		SELECT date, category, amount FROM (
			SELECT fl.date AS date, 'fuel' AS category, fl.cost AS amount
			FROM fuel_logs fl JOIN vehicles v ON v.id = fl.vehicle_id
			WHERE fl.vehicle_id = $1 AND v.user_id = $2
			UNION ALL
			SELECT ml.date, 'maintenance', ml.cost
			FROM maintenance_logs ml JOIN vehicles v ON v.id = ml.vehicle_id
			WHERE ml.vehicle_id = $1 AND v.user_id = $2
			UNION ALL
			SELECT ve.date, ve.type, ve.amount
			FROM vehicle_expenses ve JOIN vehicles v ON v.id = ve.vehicle_id
			WHERE ve.vehicle_id = $1 AND v.user_id = $2
		) combined
		ORDER BY date ASC
	`, vehicleID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := &CostOfOwnership{Entries: []CostEntry{}}
	var running float64
	for rows.Next() {
		var e CostEntry
		if err := rows.Scan(&e.Date, &e.Category, &e.Amount); err != nil {
			return nil, err
		}
		running += e.Amount
		e.RunningTotal = running
		result.Entries = append(result.Entries, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	result.Total = running
	return result, nil
}

// MonthlyBreakdown sums fuel, maintenance, and other (all vehicle_expenses combined) costs
// per calendar month, ordered oldest first.
func (s *AnalyticsStore) MonthlyBreakdown(ctx context.Context, userID, vehicleID string) ([]MonthlyBreakdown, error) {
	rows, err := s.db.Query(ctx, `
		SELECT month, SUM(fuel) AS fuel, SUM(maintenance) AS maintenance, SUM(other) AS other
		FROM (
			SELECT to_char(fl.date, 'YYYY-MM') AS month, fl.cost AS fuel, 0::double precision AS maintenance, 0::double precision AS other
			FROM fuel_logs fl JOIN vehicles v ON v.id = fl.vehicle_id
			WHERE fl.vehicle_id = $1 AND v.user_id = $2
			UNION ALL
			SELECT to_char(ml.date, 'YYYY-MM'), 0, ml.cost, 0
			FROM maintenance_logs ml JOIN vehicles v ON v.id = ml.vehicle_id
			WHERE ml.vehicle_id = $1 AND v.user_id = $2
			UNION ALL
			SELECT to_char(ve.date, 'YYYY-MM'), 0, 0, ve.amount
			FROM vehicle_expenses ve JOIN vehicles v ON v.id = ve.vehicle_id
			WHERE ve.vehicle_id = $1 AND v.user_id = $2
		) combined
		GROUP BY month
		ORDER BY month ASC
	`, vehicleID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	breakdown := []MonthlyBreakdown{}
	for rows.Next() {
		var m MonthlyBreakdown
		if err := rows.Scan(&m.Month, &m.Fuel, &m.Maintenance, &m.Other); err != nil {
			return nil, err
		}
		m.Total = m.Fuel + m.Maintenance + m.Other
		breakdown = append(breakdown, m)
	}
	return breakdown, rows.Err()
}

// EfficiencyTrend returns fuel-log efficiency over time, oldest first, skipping entries
// with no computable efficiency (e.g. the very first fill-up for a vehicle).
func (s *AnalyticsStore) EfficiencyTrend(ctx context.Context, userID, vehicleID string) ([]EfficiencyPoint, error) {
	rows, err := s.db.Query(ctx, `
		SELECT fl.date, fl.efficiency_km_l
		FROM fuel_logs fl
		JOIN vehicles v ON v.id = fl.vehicle_id
		WHERE fl.vehicle_id = $1 AND v.user_id = $2 AND fl.efficiency_km_l > 0
		ORDER BY fl.date ASC
	`, vehicleID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	points := []EfficiencyPoint{}
	for rows.Next() {
		var p EfficiencyPoint
		if err := rows.Scan(&p.Date, &p.EfficiencyKmL); err != nil {
			return nil, err
		}
		points = append(points, p)
	}
	return points, rows.Err()
}

// Compare returns a per-vehicle cost summary for vehicleIDs, restricted to vehicles owned
// by userID (any requested id the user doesn't own is silently omitted).
func (s *AnalyticsStore) Compare(ctx context.Context, userID string, vehicleIDs []string) ([]VehicleCostSummary, error) {
	rows, err := s.db.Query(ctx, `
		SELECT v.id, v.make, v.model,
			COALESCE((SELECT SUM(cost) FROM fuel_logs WHERE vehicle_id = v.id), 0) AS fuel_cost,
			COALESCE((SELECT SUM(cost) FROM maintenance_logs WHERE vehicle_id = v.id), 0) AS maintenance_cost,
			COALESCE((SELECT SUM(amount) FROM vehicle_expenses WHERE vehicle_id = v.id), 0) AS expense_cost
		FROM vehicles v
		WHERE v.user_id = $1 AND v.id = ANY($2::uuid[])
		ORDER BY v.created_at ASC
	`, userID, vehicleIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	summaries := []VehicleCostSummary{}
	for rows.Next() {
		var vc VehicleCostSummary
		if err := rows.Scan(&vc.VehicleID, &vc.Make, &vc.Model, &vc.FuelCost, &vc.MaintenanceCost, &vc.ExpenseCost); err != nil {
			return nil, err
		}
		vc.TotalCost = vc.FuelCost + vc.MaintenanceCost + vc.ExpenseCost
		summaries = append(summaries, vc)
	}
	return summaries, rows.Err()
}
