package database

import (
	"context"

	"github.com/diagdesk/device-gateway/internal/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

func NewPool(ctx context.Context, cfg config.DBConfig) (*pgxpool.Pool, error) {
	poolCfg, err := pgxpool.ParseConfig(cfg.DSN)
	if err != nil {
		return nil, err
	}
	poolCfg.MinConns = 2
	poolCfg.MaxConns = 10
	return pgxpool.NewWithConfig(ctx, poolCfg)
}
