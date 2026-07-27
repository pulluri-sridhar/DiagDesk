package repository

import (
	"context"
	"time"

	"github.com/diagdesk/device-gateway/internal/model"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MessageRepo struct {
	pool *pgxpool.Pool
}

func NewMessageRepo(pool *pgxpool.Pool) *MessageRepo {
	return &MessageRepo{pool: pool}
}

func (r *MessageRepo) Save(ctx context.Context, msg *model.DeviceMessage) error {
	msg.MessageID = uuid.New().String()
	msg.ReceivedAt = time.Now().UTC()
	_, err := r.pool.Exec(ctx, `
		INSERT INTO devices.device_messages
		  (message_id, connection_id, tenant_id, raw_message, protocol, status,
		   matched_accession_id, patient_name_in_message, test_code, value, unit, received_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
		msg.MessageID, msg.ConnectionID, msg.TenantID, msg.RawMessage, msg.Protocol, msg.Status,
		msg.MatchedAccessionID, msg.PatientNameInMsg, msg.TestCode, msg.Value, msg.Unit, msg.ReceivedAt,
	)
	return err
}

func (r *MessageRepo) FindByID(ctx context.Context, id string) (*model.DeviceMessage, error) {
	msg := &model.DeviceMessage{}
	err := r.pool.QueryRow(ctx, `
		SELECT message_id, connection_id, tenant_id, protocol, status,
		       matched_accession_id, patient_name_in_message, test_code, value, unit,
		       received_at, matched_at, matched_by
		FROM devices.device_messages
		WHERE message_id = $1`, id,
	).Scan(
		&msg.MessageID, &msg.ConnectionID, &msg.TenantID, &msg.Protocol, &msg.Status,
		&msg.MatchedAccessionID, &msg.PatientNameInMsg, &msg.TestCode, &msg.Value, &msg.Unit,
		&msg.ReceivedAt, &msg.MatchedAt, &msg.MatchedBy,
	)
	if err != nil {
		return nil, err
	}
	return msg, nil
}

func (r *MessageRepo) FindUnmatched(ctx context.Context, tenantID string) ([]*model.DeviceMessage, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT dm.message_id, dm.connection_id, dm.tenant_id, dm.protocol, dm.status,
		       dm.patient_name_in_message, dm.test_code, dm.value, dm.unit, dm.received_at,
		       dc.analyzer_id
		FROM devices.device_messages dm
		JOIN devices.device_connections dc ON dc.connection_id = dm.connection_id
		WHERE dm.tenant_id = $1 AND dm.status = 'unmatched'
		ORDER BY dm.received_at DESC
		LIMIT 200`,
		tenantID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*model.DeviceMessage
	for rows.Next() {
		msg := &model.DeviceMessage{}
		if err := rows.Scan(
			&msg.MessageID, &msg.ConnectionID, &msg.TenantID, &msg.Protocol, &msg.Status,
			&msg.PatientNameInMsg, &msg.TestCode, &msg.Value, &msg.Unit, &msg.ReceivedAt,
			&msg.AnalyzerID,
		); err != nil {
			return nil, err
		}
		list = append(list, msg)
	}
	return list, rows.Err()
}

func (r *MessageRepo) FindAll(ctx context.Context, tenantID, connectionID, fromDate, toDate, status string) ([]*model.DeviceMessage, error) {
	// Use parameter-based filtering to avoid string concatenation
	rows, err := r.pool.Query(ctx, `
		SELECT message_id, connection_id, tenant_id, raw_message, protocol, status,
		       matched_accession_id, received_at
		FROM devices.device_messages
		WHERE tenant_id = $1
		  AND ($2 = '' OR connection_id = $2)
		  AND ($3 = '' OR $3 = 'all' OR status = $3)
		  AND ($4 = '' OR received_at >= $4::timestamptz)
		  AND ($5 = '' OR received_at <= $5::timestamptz)
		ORDER BY received_at DESC
		LIMIT 500`,
		tenantID, connectionID, status, fromDate, toDate,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*model.DeviceMessage
	for rows.Next() {
		msg := &model.DeviceMessage{}
		if err := rows.Scan(
			&msg.MessageID, &msg.ConnectionID, &msg.TenantID, &msg.RawMessage,
			&msg.Protocol, &msg.Status, &msg.MatchedAccessionID, &msg.ReceivedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, msg)
	}
	return list, rows.Err()
}

func (r *MessageRepo) MarkMatched(ctx context.Context, messageID, accessionID, userID string) error {
	now := time.Now().UTC()
	_, err := r.pool.Exec(ctx, `
		UPDATE devices.device_messages
		SET status = 'matched', matched_accession_id = $1, matched_at = $2, matched_by = $3
		WHERE message_id = $4`,
		accessionID, now, nullStr(userID), messageID,
	)
	return err
}
