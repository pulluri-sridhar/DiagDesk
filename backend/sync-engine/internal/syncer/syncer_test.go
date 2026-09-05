package syncer_test

// Go test lesson:
//   Files ending in _test.go are only compiled when running `go test`.
//   The package name `syncer_test` (with _test suffix) is a "black-box" test —
//   it can only use the exported API, just like external callers.
//   This catches bugs where internal shortcuts hide real integration problems.

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/diagdesk/sync-engine/internal/model"
	"github.com/diagdesk/sync-engine/internal/syncer"
)

// newFastSyncer is a test helper that creates a Syncer with zero backoff
// so retry tests complete instantly instead of sleeping 2s+4s.
//
// Helper functions in Go tests are just regular functions — no special annotation needed.
func newFastSyncer(url string, markSynced func(context.Context, []int64) error) *syncer.Syncer {
	s := syncer.New(url, "branch-test", markSynced)
	s.InitialBackoff = 0 // no sleep in tests
	return s
}

// sampleChanges returns a small slice of changes to push in each test.
func sampleChanges() []model.ChangeLog {
	return []model.ChangeLog{
		{ID: 1, TableName: "orders", RecordID: "ord-1", Operation: model.OpInsert},
		{ID: 2, TableName: "patients", RecordID: "pat-1", Operation: model.OpUpdate},
	}
}

// ── Test 1: happy path ────────────────────────────────────────────────────────

func TestPush_Success(t *testing.T) {
	// httptest.NewServer starts a real HTTP server on a random localhost port.
	// It gives us a URL (e.g. http://127.0.0.1:54321) we can point the syncer at.
	// No mocking needed — this is a real HTTP round-trip.
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify the request looks right.
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}
		if r.URL.Path != "/sync" {
			t.Errorf("expected path /sync, got %s", r.URL.Path)
		}
		if ct := r.Header.Get("Content-Type"); ct != "application/json" {
			t.Errorf("expected Content-Type application/json, got %s", ct)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close() // always stop the test server when the test ends

	// Capture which IDs get marked synced.
	var markedIDs []int64
	markSynced := func(_ context.Context, ids []int64) error {
		markedIDs = ids
		return nil
	}

	syn := newFastSyncer(server.URL, markSynced)
	changes := sampleChanges()

	if err := syn.Push(context.Background(), changes); err != nil {
		t.Fatalf("Push() returned error: %v", err)
	}

	// After a successful push, MarkSynced must have been called with both IDs.
	if got, want := len(markedIDs), len(changes); got != want {
		t.Errorf("marked %d IDs, want %d", got, want)
	}
	if markedIDs[0] != 1 || markedIDs[1] != 2 {
		t.Errorf("unexpected marked IDs: %v", markedIDs)
	}
}

// ── Test 2: retries on transient failure ──────────────────────────────────────

func TestPush_RetriesOnTransientFailure(t *testing.T) {
	// atomic.Int32 is a thread-safe integer counter.
	// "Thread-safe" means two goroutines can increment it simultaneously
	// without corrupting the value (unlike a plain int).
	// We need this because the HTTP handler runs in a goroutine spawned by the server.
	var callCount atomic.Int32

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		n := callCount.Add(1) // atomically increment and read the new value
		if n < 3 {
			// First two calls fail — simulates a temporarily down cloud.
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		// Third call succeeds — server recovered.
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	marked := false
	syn := newFastSyncer(server.URL, func(_ context.Context, _ []int64) error {
		marked = true
		return nil
	})

	if err := syn.Push(context.Background(), sampleChanges()); err != nil {
		t.Fatalf("Push() error = %v, want nil (should succeed on 3rd attempt)", err)
	}

	if got := int(callCount.Load()); got != 3 {
		t.Errorf("server received %d requests, want 3 (2 failures + 1 success)", got)
	}
	if !marked {
		t.Error("markSynced was not called — expected it after successful push")
	}
}

// ── Test 3: gives up after max attempts ───────────────────────────────────────

func TestPush_GivesUpAfterMaxAttempts(t *testing.T) {
	var callCount atomic.Int32

	// Server always returns 502 — simulates a permanently down cloud.
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		callCount.Add(1)
		w.WriteHeader(http.StatusBadGateway)
	}))
	defer server.Close()

	marked := false
	syn := newFastSyncer(server.URL, func(_ context.Context, _ []int64) error {
		marked = true
		return nil
	})

	err := syn.Push(context.Background(), sampleChanges())

	// Push must return an error — it should NOT silently drop failures.
	if err == nil {
		t.Fatal("Push() returned nil, want an error after max retries")
	}

	// Exactly 3 attempts — not 2, not 4.
	if got := int(callCount.Load()); got != 3 {
		t.Errorf("server received %d requests, want exactly 3", got)
	}

	// markSynced must NOT be called when the push fails.
	// Calling it would incorrectly mark rows as synced when they weren't.
	if marked {
		t.Error("markSynced was called despite push failure — rows would be lost")
	}
}

// ── Test 4: context cancellation stops retry sleep ───────────────────────────

func TestPush_CancelDuringBackoff(t *testing.T) {
	// This test uses a real (non-zero) backoff to verify cancellation works.
	// We use 500ms so the test stays fast but the cancel fires during the sleep.

	var callCount atomic.Int32

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		callCount.Add(1)
		w.WriteHeader(http.StatusInternalServerError) // always fail
	}))
	defer server.Close()

	syn := syncer.New(server.URL, "branch-test", func(_ context.Context, _ []int64) error {
		return nil
	})
	syn.InitialBackoff = 500 * time.Millisecond // real but short backoff

	// Cancel after 100ms — fires while the syncer is sleeping between retries.
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	err := syn.Push(ctx, sampleChanges())

	// Push should return quickly (< 200ms) because the context cancelled mid-sleep.
	if err == nil {
		t.Fatal("Push() returned nil, want an error due to cancellation")
	}

	// Only 1 attempt should have run before the cancel fired during backoff.
	if got := int(callCount.Load()); got != 1 {
		t.Errorf("server received %d requests, want 1 (cancelled during first backoff)", got)
	}
}
