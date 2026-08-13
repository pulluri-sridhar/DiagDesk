package poller

import (
	"context"
	"log"
	"time"

	"github.com/diagdesk/sync-engine/internal/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Poller watches the local sync_outbox table for new rows.
// When it finds some, it sends them on a channel for the syncer to pick up.
type Poller struct {
	db       *pgxpool.Pool
	interval time.Duration
	out      chan<- []model.ChangeLog // out is write-only (chan<-)
}

// New creates a Poller.
// out is the channel where found changes are sent.
// interval is how often to check the table (e.g. every 5 seconds).
func New(db *pgxpool.Pool, interval time.Duration, out chan<- []model.ChangeLog) *Poller {
	return &Poller{db: db, interval: interval, out: out}
}

// Start begins polling in a goroutine and returns immediately.
//
// Goroutine lesson:
//   `go someFunc()` runs someFunc in the background — like a lightweight thread.
//   Go can run thousands of goroutines cheaply (they use ~2KB each vs ~1MB for OS threads).
//   The goroutine here loops forever, checking the DB every `interval`.
//
// Context lesson:
//   ctx.Done() is a channel that closes when the caller cancels.
//   We use `select` to wait for either: a timer tick OR a cancel signal.
//   This is how Go handles "stop this background loop cleanly."
func (p *Poller) Start(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(p.interval)
		defer ticker.Stop() // always clean up the ticker when the goroutine exits

		log.Printf("poller: started, checking every %s", p.interval)

		for {
			// select waits for whichever case is ready first.
			// This is Go's core concurrency primitive.
			select {
			case <-ctx.Done():
				// Context was cancelled (e.g. Ctrl+C) — exit the goroutine.
				log.Println("poller: stopping")
				return

			case <-ticker.C:
				// Time to check the database.
				changes, err := p.fetchPending(ctx)
				if err != nil {
					log.Printf("poller: fetch error: %v", err)
					continue // log and retry next tick
				}
				if len(changes) == 0 {
					continue // nothing to sync
				}
				log.Printf("poller: found %d pending change(s)", len(changes))
				p.out <- changes // send to the syncer via the channel
			}
		}
	}()
}

// fetchPending reads unsynced rows from the local sync_outbox table.
// It returns at most 100 rows per call to keep batches manageable.
//
// Slice lesson:
//   []model.ChangeLog is a slice — Go's dynamic array.
//   Unlike Java's ArrayList, slices are built into the language.
//   `rows.Scan(...)` fills a struct from each database row.
func (p *Poller) fetchPending(ctx context.Context) ([]model.ChangeLog, error) {
	rows, err := p.db.Query(ctx, `
		SELECT id, table_name, record_id, operation, payload, created_at
		FROM sync_outbox
		WHERE synced_at IS NULL
		ORDER BY id
		LIMIT 100
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close() // always close rows to release the connection back to the pool

	// make([]model.ChangeLog, 0, 100) creates an empty slice
	// with initial capacity 100 — avoids repeated memory allocations in the loop.
	changes := make([]model.ChangeLog, 0, 100)

	for rows.Next() { // rows.Next() advances to the next row, returns false when done
		var c model.ChangeLog
		err := rows.Scan(
			&c.ID,        // & means "address of" — pgx writes into the variable
			&c.TableName,
			&c.RecordID,
			&c.Operation,
			&c.Payload,
			&c.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		changes = append(changes, c) // append adds to the slice (like Java's .add())
	}

	return changes, rows.Err() // rows.Err() catches any error that happened during iteration
}

// MarkSynced marks rows as done after a successful push to the cloud.
// Called by the syncer after it confirms the cloud accepted the batch.
func (p *Poller) MarkSynced(ctx context.Context, ids []int64) error {
	// pgx accepts slices directly for ANY($1) — no manual IN clause needed.
	_, err := p.db.Exec(ctx, `
		UPDATE sync_outbox
		SET synced_at = now()
		WHERE id = ANY($1)
	`, ids)
	return err
}
