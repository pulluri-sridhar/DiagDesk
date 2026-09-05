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

// VectorClock maps node IDs (branch-01, central, …) to logical timestamps.
// Each node increments only its own counter when it writes a record.
//
// Reading a clock like {"branch-01": 3, "central": 5} means:
//   - 3 writes from branch-01 are reflected in this version
//   - 5 writes from central are reflected in this version
//
// When two versions of the same record have clocks where neither dominates
// the other, there is a true concurrent conflict requiring resolution.
type VectorClock map[string]int64

// Increment returns a new clock with nodeID's counter incremented by 1.
// Never mutates the receiver — treat VectorClock as immutable.
func (vc VectorClock) Increment(nodeID string) VectorClock {
	next := make(VectorClock, len(vc)+1)
	for k, v := range vc {
		next[k] = v
	}
	next[nodeID]++
	return next
}

// Dominates returns true if vc has seen every change that other has seen
// (all of vc's counters are >= other's). A version that dominates another
// is strictly newer and can safely replace it without conflict resolution.
func (vc VectorClock) Dominates(other VectorClock) bool {
	for node, val := range other {
		if vc[node] < val {
			return false
		}
	}
	return true
}

// Concurrent returns true if neither clock dominates the other.
// This is the condition that requires explicit conflict resolution.
func (vc VectorClock) Concurrent(other VectorClock) bool {
	return !vc.Dominates(other) && !other.Dominates(vc)
}

// Merge returns a new clock taking the maximum counter for each node.
// Used after conflict resolution to produce a version that subsumes both.
func (vc VectorClock) Merge(other VectorClock) VectorClock {
	merged := make(VectorClock, len(vc))
	for k, v := range vc {
		merged[k] = v
	}
	for k, v := range other {
		if v > merged[k] {
			merged[k] = v
		}
	}
	return merged
}

// ChangeLog matches a row in the local `sync.outbox` table.
// The sync-engine reads rows from this table and pushes them to the cloud.
type ChangeLog struct {
	ID          int64       `db:"id"           json:"id"`
	SchemaName  string      `db:"schema_name"  json:"schema_name"`
	TableName   string      `db:"table_name"   json:"table_name"`
	RecordID    string      `db:"record_id"    json:"record_id"`
	Operation   Operation   `db:"operation"    json:"operation"`
	Payload     []byte      `db:"payload"      json:"payload"`
	VectorClock VectorClock `db:"vector_clock" json:"vector_clock"`
	CreatedAt   time.Time   `db:"created_at"   json:"created_at"`
}

// SyncBatch is what we send to the cloud in one HTTP POST.
// Sending in batches is more efficient than one HTTP call per change.
type SyncBatch struct {
	BranchID string      `json:"branch_id"`
	Changes  []ChangeLog `json:"changes"`
}

// PullResponse is returned by the central sync endpoint GET /sync/changes.
// The sync-engine calls this to receive changes made at central since the
// last pull. NextSeq is an opaque cursor — pass it as since_seq next time.
type PullResponse struct {
	NextSeq int64       `json:"next_seq"`
	Changes []ChangeLog `json:"changes"`
}
