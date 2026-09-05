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
	"github.com/diagdesk/sync-engine/internal/conflict"
)

// Syncer pushes change batches from the local edge node to the cloud over HTTP.
// It retries failed pushes with exponential backoff before giving up.
type Syncer struct {
	cloudURL       string
	branchID       string
	client         *http.Client
	markSynced     func(ctx context.Context, ids []int64) error
	// InitialBackoff is how long to wait before the first retry.
	// It doubles on each subsequent attempt (exponential backoff).
	// Exported so tests can set it to 0 to avoid slow sleeps.
	InitialBackoff time.Duration
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
		client:         &http.Client{Timeout: 30 * time.Second},
		markSynced:     markSynced,
		InitialBackoff: 2 * time.Second,
	}
}

// Probe checks whether the cloud sync endpoint is reachable.
// Returns false if the network is down, DNS fails, or the server is slow (5 s).
// Use this before push/pull to avoid burning retry budget against a known-offline cloud.
func (s *Syncer) Probe(ctx context.Context) bool {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.cloudURL+"/sync/health", nil)
	if err != nil {
		return false
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return false
	}
	resp.Body.Close()
	return resp.StatusCode >= 200 && resp.StatusCode < 300
}

// Pull fetches changes made at central since sinceSeq.
// Returns a PullResponse with an opaque NextSeq cursor — pass it as sinceSeq next time.
// Returns an empty PullResponse (not an error) when there are no new changes.
func (s *Syncer) Pull(ctx context.Context, sinceSeq int64) (*model.PullResponse, error) {
	url := fmt.Sprintf("%s/sync/changes?branch_id=%s&since_seq=%d",
		s.cloudURL, s.branchID, sinceSeq)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("build pull request: %w", err)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("pull http get: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("central returned HTTP %d for pull", resp.StatusCode)
	}

	var result model.PullResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode pull response: %w", err)
	}
	return &result, nil
}

// ResolveConflict inspects the vector clocks on local and incoming and returns
// the winner according to the table's conflict strategy.
// Exported so tests can exercise conflict decisions without a running server.
func ResolveConflict(local, incoming model.ChangeLog) model.ChangeLog {
	localClock := local.VectorClock
	incomingClock := incoming.VectorClock

	switch {
	case localClock.Dominates(incomingClock):
		// Local is strictly newer — keep local.
		return local
	case incomingClock.Dominates(localClock):
		// Incoming is strictly newer — accept incoming.
		return incoming
	default:
		// True concurrent conflict — delegate to table strategy.
		if conflict.Resolve(local, incoming) {
			winner := incoming
			winner.VectorClock = localClock.Merge(incomingClock)
			return winner
		}
		winner := local
		winner.VectorClock = localClock.Merge(incomingClock)
		return winner
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
	backoff := s.InitialBackoff

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
