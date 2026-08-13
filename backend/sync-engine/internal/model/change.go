package model

import "time"

// Operation is a custom string type — not just any string, only these 3 values.
// This is Go's way of making an "enum".
type Operation string

const (
	OpInsert Operation = "INSERT"
	OpUpdate Operation = "UPDATE"
	OpDelete Operation = "DELETE"
)

// ChangeLog matches a row in the local `sync_outbox` table.
// The sync-engine reads rows from this table and pushes them to the cloud.
//
// Struct tag lesson:
//   The backtick strings after each field (e.g. `db:"id"`) are "tags".
//   Libraries read these at runtime to know how to map columns → fields.
//   `db:"id"` means: when reading from the database, fill this field
//   from the column named "id". `json:"id"` means: when converting to
//   JSON, use the key "id" (lowercase) instead of "ID" (Go convention).
type ChangeLog struct {
	ID          int64     `db:"id"           json:"id"`
	TableName   string    `db:"table_name"   json:"table_name"`
	RecordID    string    `db:"record_id"    json:"record_id"`
	Operation   Operation `db:"operation"    json:"operation"`
	Payload     []byte    `db:"payload"      json:"payload"`    // JSON of the changed row
	CreatedAt   time.Time `db:"created_at"   json:"created_at"`
}

// SyncBatch is what we send to the cloud in one HTTP request.
// Sending in batches is more efficient than one HTTP call per change.
type SyncBatch struct {
	BranchID string      `json:"branch_id"`
	Changes  []ChangeLog `json:"changes"`
}
