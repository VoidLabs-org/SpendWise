package finance

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrCategoryNotFound = errors.New("category not found")

var defaultCategories = []struct {
	Name  string
	Icon  string
	Color string
}{
	{"Food", "utensils", "#F59E0B"},
	{"Transport", "car", "#3B82F6"},
	{"Shopping", "bag", "#EC4899"},
	{"Bills", "receipt", "#EF4444"},
	{"Entertainment", "film", "#8B5CF6"},
	{"Health", "heart", "#10B981"},
	{"Education", "book", "#06B6D4"},
	{"Other", "dots", "#6B7280"},
}

type CategoryStore struct {
	db *pgxpool.Pool
}

func NewCategoryStore(db *pgxpool.Pool) *CategoryStore {
	return &CategoryStore{db: db}
}

func (s *CategoryStore) Migrate(ctx context.Context) error {
	_, err := s.db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS categories (
			id UUID PRIMARY KEY,
			user_id TEXT,
			name TEXT NOT NULL,
			icon TEXT NOT NULL DEFAULT '',
			color TEXT NOT NULL DEFAULT '',
			archived BOOLEAN NOT NULL DEFAULT false
		)
	`)
	return err
}

// SeedDefaults inserts the spec's 8 default categories as global rows (user_id IS NULL) if
// they don't already exist. Idempotent — safe to call on every boot.
func (s *CategoryStore) SeedDefaults(ctx context.Context) error {
	var count int
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM categories WHERE user_id IS NULL`).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	for _, c := range defaultCategories {
		if _, err := s.db.Exec(ctx, `
			INSERT INTO categories (id, user_id, name, icon, color, archived)
			VALUES ($1, NULL, $2, $3, $4, false)
		`, uuid.NewString(), c.Name, c.Icon, c.Color); err != nil {
			return err
		}
	}
	return nil
}

func (s *CategoryStore) Create(ctx context.Context, userID string, in CategoryInput) (*Category, error) {
	var c Category
	err := s.db.QueryRow(ctx, `
		INSERT INTO categories (id, user_id, name, icon, color, archived)
		VALUES ($1, $2, $3, $4, $5, false)
		RETURNING id, user_id, name, icon, color, archived
	`, uuid.NewString(), userID, in.Name, in.Icon, in.Color).Scan(
		&c.ID, &c.UserID, &c.Name, &c.Icon, &c.Color, &c.Archived,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// List returns the global defaults plus this user's custom categories, excluding archived
// ones unless includeArchived is set.
func (s *CategoryStore) List(ctx context.Context, userID string, includeArchived bool) ([]Category, error) {
	query := `SELECT id, user_id, name, icon, color, archived FROM categories WHERE (user_id IS NULL OR user_id = $1)`
	if !includeArchived {
		query += ` AND archived = false`
	}
	query += ` ORDER BY user_id NULLS FIRST, name`

	rows, err := s.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Category
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.ID, &c.UserID, &c.Name, &c.Icon, &c.Color, &c.Archived); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// Patch updates a category the requesting user owns (custom categories only — the global
// defaults have no owning user and can't be edited this way).
func (s *CategoryStore) Patch(ctx context.Context, id, userID string, in CategoryPatch) (*Category, error) {
	var c Category
	err := s.db.QueryRow(ctx, `
		UPDATE categories SET
			icon = COALESCE($1, icon),
			color = COALESCE($2, color),
			archived = COALESCE($3, archived)
		WHERE id = $4 AND user_id = $5
		RETURNING id, user_id, name, icon, color, archived
	`, in.Icon, in.Color, in.Archived, id, userID).Scan(
		&c.ID, &c.UserID, &c.Name, &c.Icon, &c.Color, &c.Archived,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCategoryNotFound
		}
		return nil, err
	}
	return &c, nil
}
