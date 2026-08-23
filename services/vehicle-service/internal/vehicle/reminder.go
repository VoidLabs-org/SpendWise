package vehicle

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrReminderNotFound = errors.New("reminder not found")

var validReminderKinds = map[string]bool{
	"insurance":       true,
	"revenue_licence": true,
	"emission_test":   true,
	"service":         true,
	"custom":          true,
}

func IsValidReminderKind(k string) bool {
	return validReminderKinds[k]
}

type Reminder struct {
	ID               string    `json:"id"`
	VehicleID        string    `json:"vehicle_id"`
	Title            string    `json:"title"`
	Kind             string    `json:"kind"`
	DueDate          time.Time `json:"due_date"`
	DueOdometer      float64   `json:"due_odometer"`
	NotifyDaysBefore int       `json:"notify_days_before"`
	CreatedAt        time.Time `json:"created_at"`
}

// ReminderDue is a Reminder augmented with the owning vehicle's user, for the
// notification scanner — the only place a reminder needs to be looked at without a
// caller-supplied user id to scope by.
type ReminderDue struct {
	Reminder
	UserID string
}

type ReminderStore struct {
	db *pgxpool.Pool
}

func NewReminderStore(db *pgxpool.Pool) *ReminderStore {
	return &ReminderStore{db: db}
}

func (s *ReminderStore) Migrate(ctx context.Context) error {
	if _, err := s.db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS reminders (
			id UUID PRIMARY KEY,
			vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
			title TEXT NOT NULL,
			kind TEXT NOT NULL,
			due_date TIMESTAMPTZ,
			due_odometer DOUBLE PRECISION,
			notify_days_before INTEGER NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`); err != nil {
		return err
	}

	// Tracks when vehicle.reminder.due was last published for a reminder, so the notify
	// scanner doesn't refire on every tick once a reminder enters its notify window.
	_, err := s.db.Exec(ctx, `
		ALTER TABLE reminders ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ
	`)
	return err
}

const reminderColumns = `id, vehicle_id, title, kind, due_date, due_odometer, notify_days_before, created_at`

func scanReminder(row pgx.Row) (*Reminder, error) {
	var r Reminder
	var dueDate *time.Time
	var dueOdometer *float64
	err := row.Scan(&r.ID, &r.VehicleID, &r.Title, &r.Kind, &dueDate, &dueOdometer, &r.NotifyDaysBefore, &r.CreatedAt)
	if err != nil {
		return nil, err
	}
	if dueDate != nil {
		r.DueDate = *dueDate
	}
	if dueOdometer != nil {
		r.DueOdometer = *dueOdometer
	}
	return &r, nil
}

func (s *ReminderStore) Create(ctx context.Context, id, vehicleID string, r Reminder) (*Reminder, error) {
	var dueDate *time.Time
	if !r.DueDate.IsZero() {
		dueDate = &r.DueDate
	}
	var dueOdometer *float64
	if r.DueOdometer != 0 {
		dueOdometer = &r.DueOdometer
	}

	row := s.db.QueryRow(ctx, `
		INSERT INTO reminders (id, vehicle_id, title, kind, due_date, due_odometer, notify_days_before)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING `+reminderColumns,
		id, vehicleID, r.Title, r.Kind, dueDate, dueOdometer, r.NotifyDaysBefore,
	)
	return scanReminder(row)
}

func (s *ReminderStore) ListByVehicle(ctx context.Context, userID, vehicleID string) ([]Reminder, error) {
	rows, err := s.db.Query(ctx, `
		SELECT rm.id, rm.vehicle_id, rm.title, rm.kind, rm.due_date, rm.due_odometer, rm.notify_days_before, rm.created_at
		FROM reminders rm
		JOIN vehicles v ON v.id = rm.vehicle_id
		WHERE rm.vehicle_id = $1 AND v.user_id = $2
		ORDER BY rm.due_date ASC NULLS LAST, rm.created_at ASC
	`, vehicleID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	reminders := []Reminder{}
	for rows.Next() {
		r, err := scanReminder(rows)
		if err != nil {
			return nil, err
		}
		reminders = append(reminders, *r)
	}
	return reminders, rows.Err()
}

func (s *ReminderStore) Update(ctx context.Context, userID, id string, r Reminder) (*Reminder, error) {
	var dueDate *time.Time
	if !r.DueDate.IsZero() {
		dueDate = &r.DueDate
	}
	var dueOdometer *float64
	if r.DueOdometer != 0 {
		dueOdometer = &r.DueOdometer
	}

	row := s.db.QueryRow(ctx, `
		UPDATE reminders rm
		SET title = $1, kind = $2, due_date = $3, due_odometer = $4, notify_days_before = $5, notified_at = NULL
		FROM vehicles v
		WHERE rm.vehicle_id = v.id AND rm.id = $6 AND v.user_id = $7
		RETURNING rm.id, rm.vehicle_id, rm.title, rm.kind, rm.due_date, rm.due_odometer, rm.notify_days_before, rm.created_at
	`, r.Title, r.Kind, dueDate, dueOdometer, r.NotifyDaysBefore, id, userID)
	rem, err := scanReminder(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrReminderNotFound
		}
		return nil, err
	}
	return rem, nil
}

// DueForNotification returns reminders across all users that have entered their
// notify window (due_date within notify_days_before days from now) and have not yet been
// notified. Used by the background scanner, not scoped to a single user.
func (s *ReminderStore) DueForNotification(ctx context.Context) ([]ReminderDue, error) {
	rows, err := s.db.Query(ctx, `
		SELECT rm.id, rm.vehicle_id, rm.title, rm.kind, rm.due_date, rm.due_odometer, rm.notify_days_before, rm.created_at, v.user_id
		FROM reminders rm
		JOIN vehicles v ON v.id = rm.vehicle_id
		WHERE rm.notified_at IS NULL
			AND rm.due_date IS NOT NULL
			AND rm.due_date <= now() + make_interval(days => rm.notify_days_before)
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	due := []ReminderDue{}
	for rows.Next() {
		var d ReminderDue
		var dueDate *time.Time
		var dueOdometer *float64
		if err := rows.Scan(&d.ID, &d.VehicleID, &d.Title, &d.Kind, &dueDate, &dueOdometer, &d.NotifyDaysBefore, &d.CreatedAt, &d.UserID); err != nil {
			return nil, err
		}
		if dueDate != nil {
			d.DueDate = *dueDate
		}
		if dueOdometer != nil {
			d.DueOdometer = *dueOdometer
		}
		due = append(due, d)
	}
	return due, rows.Err()
}

func (s *ReminderStore) MarkNotified(ctx context.Context, id string) error {
	_, err := s.db.Exec(ctx, `UPDATE reminders SET notified_at = now() WHERE id = $1`, id)
	return err
}

func (s *ReminderStore) Delete(ctx context.Context, userID, id string) error {
	tag, err := s.db.Exec(ctx, `
		DELETE FROM reminders
		USING vehicles
		WHERE reminders.vehicle_id = vehicles.id AND reminders.id = $1 AND vehicles.user_id = $2
	`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrReminderNotFound
	}
	return nil
}
