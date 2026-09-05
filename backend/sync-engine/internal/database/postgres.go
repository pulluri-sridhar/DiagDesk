package database

import (
	"context"
	"fmt"

	"github.com/diagdesk/sync-engine/internal/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

// domainTables lists the schema.table pairs that should write to sync.outbox.
// Flyway creates these tables after service startup, so we attach triggers
// at sync-engine boot rather than in the PostgreSQL initdb script.
var domainTables = []struct{ schema, table string }{
	{"patient", "patients"},
	{"orders", "orders"},
	{"orders", "order_items"},
	{"results", "results"},
	{"reporting", "reports"},
}

// EnsureOutboxTriggers creates (or replaces) the sync triggers on each domain
// table. Safe to call multiple times — CREATE OR REPLACE is idempotent.
//
// Must be called AFTER Flyway has run the service migrations so the domain
// tables exist. If a table does not exist yet the error is logged and skipped;
// the trigger will be installed on the next boot once Flyway has run.
func EnsureOutboxTriggers(ctx context.Context, pool *pgxpool.Pool) error {
	for _, t := range domainTables {
		triggerName := "sync_" + t.table
		_, err := pool.Exec(ctx, fmt.Sprintf(`
			CREATE OR REPLACE TRIGGER %s
				AFTER INSERT OR UPDATE OR DELETE ON %s.%s
				FOR EACH ROW EXECUTE FUNCTION sync.record_change()`,
			triggerName, t.schema, t.table))
		if err != nil {
			// Table may not exist yet — log and continue rather than aborting.
			fmt.Printf("database: skipping trigger %s on %s.%s: %v\n",
				triggerName, t.schema, t.table, err)
		}
	}
	return nil
}

// NewPool creates a connection pool to the local PostgreSQL database.
//
// Go error handling lesson:
//   Every operation that can fail returns (result, error) — two values.
//   You always check: if err != nil { handle it }.
//   There are no exceptions. No try/catch. This forces you to think about
//   failures at every step, which makes Go programs very reliable.
//
// context.Context lesson:
//   A context carries a deadline or cancel signal through your program.
//   If the caller cancels (e.g. Ctrl+C), pgx stops waiting for the DB.
//   You pass ctx as the first argument to almost every blocking call in Go.
func NewPool(ctx context.Context, cfg config.DBConfig) (*pgxpool.Pool, error) {
	// pgxpool.ParseConfig turns the DSN string into a config struct.
	// If the DSN is malformed, it returns an error — we wrap it with context.
	poolCfg, err := pgxpool.ParseConfig(cfg.DSN)
	if err != nil {
		// fmt.Errorf wraps the original error with more detail.
		// %w means "wrap this error so callers can inspect it with errors.Is()".
		return nil, fmt.Errorf("parse db dsn: %w", err)
	}

	poolCfg.MinConns = 1
	poolCfg.MaxConns = 5 // sync-engine is lightweight — small pool is fine

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("connect to local db: %w", err)
	}

	// Ping confirms the connection actually works (not just that the URL parsed).
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping local db: %w", err)
	}

	return pool, nil // nil error means success
}
