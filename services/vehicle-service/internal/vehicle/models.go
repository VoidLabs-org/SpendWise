package vehicle

import "time"

type Vehicle struct {
	ID               string    `json:"id"`
	UserID           string    `json:"user_id"`
	Make             string    `json:"make"`
	Model            string    `json:"model"`
	Year             int       `json:"year"`
	PlateNumber      string    `json:"plate_number"`
	FuelType         string    `json:"fuel_type"`
	Odometer         float64   `json:"odometer"`
	PhotoURL         string    `json:"photo_url"`
	IsPrimary        bool      `json:"is_primary"`
	EfficiencyKmL    float64   `json:"eff"`
	CostPerKm        float64   `json:"cost_per_km"`
	EstimatedRangeKm float64   `json:"estimated_range_km"`
	CreatedAt        time.Time `json:"created_at"`
}
