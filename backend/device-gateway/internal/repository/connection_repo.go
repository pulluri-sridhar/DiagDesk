package repository

import (
	"context"
	"time"

	"github.com/diagdesk/device-gateway/internal/model"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ConnectionRepo struct {
	pool *pgxpool.Pool
}

func NewConnectionRepo(pool *pgxpool.Pool) *ConnectionRepo {
	return &ConnectionRepo{pool: pool}
}

func (r *ConnectionRepo) Create(ctx context.Context, dc *model.DeviceConnection) error {
	dc.ConnectionID = uuid.New().String()
	dc.CreatedAt = time.Now().UTC()
	dc.Status = model.StatusDisconnected

	_, err := r.pool.Exec(ctx, `
		INSERT INTO devices.device_connections
		  (connection_id, tenant_id, branch_id, department_id, analyzer_id,
		   display_name, protocol, host, port, model, serial_number, status, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
		dc.ConnectionID, dc.TenantID, dc.BranchID, nullStr(dc.DepartmentID), dc.AnalyzerID,
		dc.DisplayName, dc.Protocol, dc.Host, dc.Port, nullStr(dc.Model), nullStr(dc.SerialNumber),
		dc.Status, dc.CreatedAt,
	)
	return err
}

func (r *ConnectionRepo) FindByID(ctx context.Context, id, tenantID string) (*model.DeviceConnection, error) {
	dc := &model.DeviceConnection{}
	var deptID, modelStr, serial *string
	err := r.pool.QueryRow(ctx, `
		SELECT connection_id, tenant_id, branch_id, department_id, analyzer_id,
		       display_name, protocol, host, port, model, serial_number,
		       status, last_seen_at, created_at, updated_at
		FROM devices.device_connections
		WHERE connection_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
		id, tenantID,
	).Scan(
		&dc.ConnectionID, &dc.TenantID, &dc.BranchID, &deptID, &dc.AnalyzerID,
		&dc.DisplayName, &dc.Protocol, &dc.Host, &dc.Port, &modelStr, &serial,
		&dc.Status, &dc.LastSeenAt, &dc.CreatedAt, &dc.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if deptID != nil {
		dc.DepartmentID = *deptID
	}
	if modelStr != nil {
		dc.Model = *modelStr
	}
	if serial != nil {
		dc.SerialNumber = *serial
	}
	return dc, nil
}

func (r *ConnectionRepo) FindAll(ctx context.Context, tenantID string) ([]*model.DeviceConnection, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT connection_id, tenant_id, branch_id, department_id, analyzer_id,
		       display_name, protocol, host, port, model, serial_number,
		       status, last_seen_at, created_at, updated_at
		FROM devices.device_connections
		WHERE tenant_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC`,
		tenantID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanConnections(rows)
}

func (r *ConnectionRepo) FindAllActive(ctx context.Context) ([]*model.DeviceConnection, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT connection_id, tenant_id, branch_id, department_id, analyzer_id,
		       display_name, protocol, host, port, model, serial_number,
		       status, last_seen_at, created_at, updated_at
		FROM devices.device_connections
		WHERE deleted_at IS NULL`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanConnections(rows)
}

func (r *ConnectionRepo) UpdateStatus(ctx context.Context, id string, status model.ConnectionStatus, lastSeenAt *time.Time) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE devices.device_connections
		SET status = $1, last_seen_at = $2, updated_at = now()
		WHERE connection_id = $3`,
		status, lastSeenAt, id,
	)
	return err
}

func (r *ConnectionRepo) SoftDelete(ctx context.Context, id, tenantID string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE devices.device_connections
		SET deleted_at = now(), updated_at = now()
		WHERE connection_id = $1 AND tenant_id = $2`,
		id, tenantID,
	)
	return err
}

func (r *ConnectionRepo) DailyStats(ctx context.Context, connectionID string) (received, matched, unmatched int64, err error) {
	err = r.pool.QueryRow(ctx, `
		SELECT
		  COUNT(*)                                       AS received,
		  COUNT(*) FILTER (WHERE status = 'matched')    AS matched,
		  COUNT(*) FILTER (WHERE status = 'unmatched')  AS unmatched
		FROM devices.device_messages
		WHERE connection_id = $1
		  AND received_at >= CURRENT_DATE`,
		connectionID,
	).Scan(&received, &matched, &unmatched)
	return
}

func scanConnections(rows interface {
	Next() bool
	Scan(...any) error
	Err() error
}) ([]*model.DeviceConnection, error) {
	var list []*model.DeviceConnection
	for rows.Next() {
		dc := &model.DeviceConnection{}
		var deptID, modelStr, serial *string
		if err := rows.Scan(
			&dc.ConnectionID, &dc.TenantID, &dc.BranchID, &deptID, &dc.AnalyzerID,
			&dc.DisplayName, &dc.Protocol, &dc.Host, &dc.Port, &modelStr, &serial,
			&dc.Status, &dc.LastSeenAt, &dc.CreatedAt, &dc.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if deptID != nil {
			dc.DepartmentID = *deptID
		}
		if modelStr != nil {
			dc.Model = *modelStr
		}
		if serial != nil {
			dc.SerialNumber = *serial
		}
		list = append(list, dc)
	}
	return list, rows.Err()
}

func nullStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
