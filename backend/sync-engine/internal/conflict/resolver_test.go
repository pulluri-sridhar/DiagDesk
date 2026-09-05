package conflict_test

import (
	"testing"
	"time"

	"github.com/diagdesk/sync-engine/internal/conflict"
	"github.com/diagdesk/sync-engine/internal/model"
)

func change(table string, ts time.Time) model.ChangeLog {
	return model.ChangeLog{
		TableName: table,
		CreatedAt: ts,
		Operation: model.OpUpdate,
	}
}

func TestResolve_BranchWins(t *testing.T) {
	local := change("patients", time.Now().Add(-1*time.Minute))
	incoming := change("patients", time.Now())
	// patients is BranchWins — incoming is newer but should still lose
	if conflict.Resolve(local, incoming) {
		t.Error("Resolve(patients): expected false (branch wins), got true")
	}
}

func TestResolve_CentralWins(t *testing.T) {
	local := change("catalog_tests", time.Now())
	incoming := change("catalog_tests", time.Now().Add(-1*time.Minute))
	// catalog_tests is CentralWins — local is newer but central still wins
	if !conflict.Resolve(local, incoming) {
		t.Error("Resolve(catalog_tests): expected true (central wins), got false")
	}
}

func TestResolve_LastWriteWins_IncomingNewer(t *testing.T) {
	local := change("results", time.Now().Add(-2*time.Minute))
	incoming := change("results", time.Now())
	if !conflict.Resolve(local, incoming) {
		t.Error("Resolve(results): incoming is newer — expected true")
	}
}

func TestResolve_LastWriteWins_LocalNewer(t *testing.T) {
	local := change("reports", time.Now())
	incoming := change("reports", time.Now().Add(-2*time.Minute))
	if conflict.Resolve(local, incoming) {
		t.Error("Resolve(reports): local is newer — expected false")
	}
}

func TestResolve_UnknownTable_LastWriteWins(t *testing.T) {
	local := change("some_unknown_table", time.Now())
	incoming := change("some_unknown_table", time.Now().Add(-1*time.Minute))
	if conflict.Resolve(local, incoming) {
		t.Error("unknown table should default to LastWriteWins; local is newer so expected false")
	}
}
