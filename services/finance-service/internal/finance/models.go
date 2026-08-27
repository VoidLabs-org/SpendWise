package finance

import "time"

type Transaction struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	Amount     float64   `json:"amount"`
	Category   string    `json:"category"`
	Note       string    `json:"note"`
	PhotoURL   string    `json:"photo_url,omitempty"`
	Source     *string   `json:"source,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
	CreatedAt  time.Time `json:"created_at"`
}

type TransactionInput struct {
	Amount     float64    `json:"amount" binding:"required"`
	Category   string     `json:"category" binding:"required"`
	Note       string     `json:"note"`
	PhotoURL   string     `json:"photo_url"`
	OccurredAt *time.Time `json:"occurred_at"`
}

type Category struct {
	ID       string  `json:"id"`
	UserID   *string `json:"user_id,omitempty"`
	Name     string  `json:"name"`
	Icon     string  `json:"icon"`
	Color    string  `json:"color"`
	Archived bool    `json:"archived"`
}

type CategoryInput struct {
	Name  string `json:"name" binding:"required"`
	Icon  string `json:"icon"`
	Color string `json:"color"`
}

type CategoryPatch struct {
	Icon     *string `json:"icon"`
	Color    *string `json:"color"`
	Archived *bool   `json:"archived"`
}

type Budget struct {
	ID                 string  `json:"id"`
	UserID             string  `json:"user_id"`
	Category           string  `json:"category"`
	LimitAmount        float64 `json:"limit_amount"`
	Month              string  `json:"month"`
	Rollover           bool    `json:"rollover"`
	LastAlertThreshold int     `json:"last_alert_threshold"`
	Spent              float64 `json:"spent"`
}

type BudgetInput struct {
	Category    string  `json:"category" binding:"required"`
	LimitAmount float64 `json:"limit_amount" binding:"required"`
	Month       string  `json:"month" binding:"required"`
	Rollover    bool    `json:"rollover"`
}

type BudgetPatch struct {
	LimitAmount *float64 `json:"limit_amount"`
	Rollover    *bool    `json:"rollover"`
}

// RecurringTransaction is a template that spawns a real Transaction on creation and again each
// time it comes due, tracked via NextOccurrence — same shape as vehicle-service's Reminder.
type RecurringTransaction struct {
	ID             string    `json:"id"`
	UserID         string    `json:"user_id"`
	Amount         float64   `json:"amount"`
	Category       string    `json:"category"`
	Note           string    `json:"note"`
	PhotoURL       string    `json:"photo_url,omitempty"`
	Frequency      string    `json:"frequency"` // "daily" | "weekly" | "monthly"
	NextOccurrence time.Time `json:"next_occurrence"`
	CreatedAt      time.Time `json:"created_at"`
}

type RecurringTransactionInput struct {
	Amount    float64 `json:"amount" binding:"required"`
	Category  string  `json:"category" binding:"required"`
	Note      string  `json:"note"`
	PhotoURL  string  `json:"photo_url"`
	Frequency string  `json:"frequency" binding:"required,oneof=daily weekly monthly"`
}
