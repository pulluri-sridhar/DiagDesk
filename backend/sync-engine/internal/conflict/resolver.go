package conflict

import "github.com/diagdesk/sync-engine/internal/model"

// Strategy defines how a concurrent conflict is resolved for a given table.
type Strategy int

const (
	// LastWriteWins selects the change with the later wall-clock timestamp.
	LastWriteWins Strategy = iota
	// BranchWins keeps the local (branch) version and discards the incoming central change.
	BranchWins
	// CentralWins applies the incoming (central) version and overwrites the local one.
	CentralWins
)

// tableStrategies maps table names to conflict resolution strategies.
// Tables not listed here fall back to LastWriteWins.
//
// Design rationale:
//   - patient/order tables: branch staff have ground-truth — BranchWins
//   - catalog tables: HQ manages reference data centrally — CentralWins
//   - results/reports: whoever edited last is authoritative — LastWriteWins
var tableStrategies = map[string]Strategy{
	"patients":         BranchWins,
	"orders":           BranchWins,
	"order_items":      BranchWins,
	"catalog_tests":    CentralWins,
	"catalog_packages": CentralWins,
	"results":          LastWriteWins,
	"reports":          LastWriteWins,
	"notifications":    LastWriteWins,
}

// Resolve returns true if the incoming (central) change should overwrite
// the local (branch) copy of the same record.
//
// Only call this when the two changes are concurrent (neither clock dominates).
// When one clock dominates the other, the dominated version is discarded without
// calling Resolve — there is no conflict, just a causal ordering.
func Resolve(local, incoming model.ChangeLog) bool {
	strategy, ok := tableStrategies[local.TableName]
	if !ok {
		strategy = LastWriteWins
	}

	switch strategy {
	case BranchWins:
		return false // keep local; discard incoming
	case CentralWins:
		return true // apply incoming; overwrite local
	default: // LastWriteWins
		return incoming.CreatedAt.After(local.CreatedAt)
	}
}
