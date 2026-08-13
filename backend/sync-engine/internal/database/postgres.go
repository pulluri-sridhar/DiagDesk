package database

import (
	"context"
	"fmt"

	"github.com/diagdesk/sync-engine/internal/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

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
