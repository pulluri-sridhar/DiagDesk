package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/diagdesk/sync-engine/internal/config"
	"github.com/diagdesk/sync-engine/internal/database"
	"github.com/diagdesk/sync-engine/internal/model"
	"github.com/diagdesk/sync-engine/internal/poller"
)

func main() {
	cfg := config.Load()

	// context.WithCancel creates a context we can cancel ourselves.
	// We cancel it when the process receives SIGINT/SIGTERM — this
	// signal travels through ctx.Done() to every goroutine that listens.
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Connect to the local PostgreSQL database.
	pool, err := database.NewPool(ctx, cfg.LocalDB)
	if err != nil {
		// log.Fatalf prints the error and exits the process immediately.
		// Used here because without a DB connection the service is useless.
		log.Fatalf("db: %v", err)
	}
	defer pool.Close()

	log.Printf("sync-engine starting | branch=%s poll=%s sync=%s",
		cfg.BranchID, cfg.PollEvery, cfg.SyncEvery)

	// The channel connects the Poller (producer) to the syncer loop (consumer).
	// make(chan T, N) creates a buffered channel with capacity N.
	// Buffered means the poller can send up to 10 batches without the
	// syncer reading them yet — prevents the goroutines from blocking each other.
	changes := make(chan []model.ChangeLog, 10)

	// Start the poller in the background.
	p := poller.New(pool, cfg.PollEvery, changes)
	p.Start(ctx)

	// Wait for OS signal to shut down.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// The main goroutine processes change batches as they arrive,
	// and exits when it receives a shutdown signal.
	for {
		select {
		case <-quit:
			log.Println("sync-engine shutting down...")
			cancel() // signal all goroutines to stop
			return

		case batch := <-changes:
			// Next step: we'll build the syncer that pushes this batch to the cloud.
			log.Printf("main: received batch of %d change(s) — syncer not built yet", len(batch))
		}
	}
}
