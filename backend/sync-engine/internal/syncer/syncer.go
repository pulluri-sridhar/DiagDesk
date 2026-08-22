package syncer

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/diagdesk/sync-engine/internal/model"
)

// Syncer pushes change batches from the local edge node to the cloud over HTTP.
// It retries failed pushes with exponential backoff before giving up.
type Syncer struct {
	cloudURL   string
	branchID   string
	client     *http.Client
	markSynced func(ctx context.Context, ids []int64) error
}

// New creates a Syncer.
//
// markSynced is a function value — in Go, functions are first-class values.
// You can pass a function as an argument just like you pass a string or int.
// Here we pass poller.MarkSynced so the syncer can stamp rows as done
// without importing the poller package (avoids a circular dependency).
func New(cloudURL, branchID string, markSynced func(ctx context.Context, ids []int64) error) *Syncer {
	return &Syncer{
		cloudURL: cloudURL,
		branchID: branchID,
		// http.Client with a timeout — ALWAYS set a timeout on HTTP clients.
		// Without one, a slow cloud server stalls this goroutine forever.
		client:     &http.Client{Timeout: 30 * time.Second},
		markSynced: markSynced,
	}
}

// Push sends one batch of changes to the cloud, then marks them synced locally.
//
// The function returns an error if the push fails after all retries.
// The caller (main.go) logs it and moves on — the rows stay unsynced and
// the poller will pick them up again on the next tick.
func (s *Syncer) Push(ctx context.Context, changes []model.ChangeLog) error {
	// Wrap the raw changes in a SyncBatch so the cloud knows which branch sent them.
	batch := model.SyncBatch{
		BranchID: s.branchID,
		Changes:  changes,
	}

	// json.Marshal converts the Go struct to a JSON byte slice.
	// []byte is Go's "array of bytes" — the raw JSON text.
	body, err := json.Marshal(batch)
	if err != nil {
		// This should never fail for a well-typed struct, but Go makes you handle it.
		return fmt.Errorf("marshal batch: %w", err)
	}

	// Retry with exponential backoff: wait 2s, then 4s, then give up.
	//
	// Exponential backoff lesson:
	//   If the cloud is temporarily down, hammering it immediately makes things worse.
	//   Doubling the wait each time gives the server space to recover.
	//   3 attempts → 2s + 4s = 6s total wait before giving up.
	const maxAttempts = 3
	backoff := 2 * time.Second

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		err = s.post(ctx, body)
		if err == nil {
			break // success — exit the retry loop
		}

		log.Printf("syncer: attempt %d/%d failed: %v", attempt, maxAttempts, err)

		if attempt < maxAttempts {
			// select with time.After is Go's non-blocking sleep.
			// It waits for whichever happens first: the timer fires, or ctx is cancelled.
			// If ctx is cancelled (e.g. Ctrl+C), we stop immediately instead of sleeping.
			select {
			case <-ctx.Done():
				return fmt.Errorf("syncer: cancelled during backoff: %w", ctx.Err())
			case <-time.After(backoff):
				backoff *= 2 // double the wait: 2s → 4s → 8s (if we added a 4th attempt)
			}
		}
	}

	if err != nil {
		return fmt.Errorf("push failed after %d attempts: %w", maxAttempts, err)
	}

	// Collect the IDs of every row we successfully pushed.
	//
	// make([]int64, len(changes)) creates a slice pre-sized to hold exactly
	// len(changes) elements — more efficient than starting empty and appending.
	ids := make([]int64, len(changes))
	for i, c := range changes {
		ids[i] = c.ID
	}

	// Stamp synced_at on each row so the poller doesn't re-send them.
	if err := s.markSynced(ctx, ids); err != nil {
		// The push succeeded but marking failed — the rows will be re-sent next tick.
		// The cloud must handle duplicate deliveries (idempotent upsert on record_id).
		return fmt.Errorf("push ok but mark-synced failed (will retry): %w", err)
	}

	log.Printf("syncer: pushed %d change(s) to cloud and marked synced", len(changes))
	return nil
}

// post sends the JSON body to the cloud sync endpoint.
// It is a private helper — lowercase first letter = unexported in Go.
//
// HTTP request lesson:
//   http.NewRequestWithContext attaches a context so the request is
//   automatically cancelled if ctx is cancelled (e.g. process shutdown).
//   Always prefer NewRequestWithContext over NewRequest.
//
// bytes.NewReader wraps a []byte so it satisfies io.Reader,
// which is what http.NewRequest expects for the body.
func (s *Syncer) post(ctx context.Context, body []byte) error {
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		s.cloudURL+"/sync",
		bytes.NewReader(body), // body must be io.Reader, not []byte directly
	)
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("http post: %w", err)
	}
	// defer runs when the surrounding function returns — always close the body
	// to release the underlying TCP connection back to the pool.
	defer resp.Body.Close()

	// 2xx = success. Anything else is an error we should retry.
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("cloud returned HTTP %d", resp.StatusCode)
	}

	return nil
}
