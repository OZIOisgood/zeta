package testdb

import (
	"context"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

// New starts a Postgres 16 container (via testcontainers), applies all
// migrations, and returns a ready-to-use connection pool. The container
// and pool are cleaned up automatically when the test finishes.
func New(t *testing.T) *pgxpool.Pool {
	t.Helper()
	ctx := context.Background()

	ctr, err := postgres.Run(ctx,
		"postgres:16-alpine",
		postgres.WithDatabase("zeta_test"),
		postgres.WithUsername("test"),
		postgres.WithPassword("test"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(30*time.Second),
		),
	)
	if err != nil {
		t.Fatalf("testdb: start container: %v", err)
	}
	t.Cleanup(func() { ctr.Terminate(ctx) })

	connStr, err := ctr.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("testdb: connection string: %v", err)
	}

	applyMigrations(t, connStr)

	pool, err := pgxpool.New(ctx, connStr)
	if err != nil {
		t.Fatalf("testdb: create pool: %v", err)
	}
	t.Cleanup(pool.Close)

	return pool
}

// migrationsDir returns the absolute path to db/migrations/ relative to the
// project root. It uses runtime.Caller to locate this source file, then
// walks up to the repo root.
func migrationsDir() string {
	_, thisFile, _, _ := runtime.Caller(0)
	// thisFile = .../internal/testdb/testdb.go
	repoRoot := filepath.Join(filepath.Dir(thisFile), "..", "..")
	return filepath.Join(repoRoot, "db", "migrations")
}

func applyMigrations(t *testing.T, connStr string) {
	t.Helper()

	m, err := migrate.New("file://"+migrationsDir(), "pgx5://"+connStr[len("postgres://"):])
	if err != nil {
		t.Fatalf("testdb: create migrator: %v", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		t.Fatalf("testdb: apply migrations: %v", err)
	}
}
