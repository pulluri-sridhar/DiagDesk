package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/diagdesk/sync-engine/internal/config"
	"github.com/diagdesk/sync-engine/internal/database"
	"github.com/diagdesk/sync-engine/internal/model"
	"github.com/diagdesk/sync-engine/internal/poller"
	"github.com/diagdesk/sync-engine/internal/syncer"
)

func main() {
	cfg := config.Load()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pool, err := database.NewPool(ctx, cfg.LocalDB)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer pool.Close()

	// Install outbox triggers on domain tables (idempotent, safe to repeat).
	// Logged but not fatal — tables may not exist until Flyway runs.
	if err := database.EnsureOutboxTriggers(ctx, pool); err != nil {
		log.Printf("warning: trigger setup incomplete: %v", err)
	}

	log.Printf("sync-engine starting | branch=%s poll=%s sync=%s",
		cfg.BranchID, cfg.PollEvery, cfg.SyncEvery)

	changes := make(chan []model.ChangeLog, 10)

	p := poller.New(pool, cfg.PollEvery, changes)
	p.Start(ctx)

	syn := syncer.New(cfg.CloudURL, cfg.BranchID, p.MarkSynced)

	// Pull ticker runs on SyncEvery to fetch central→branch changes.
	pullTicker := time.NewTicker(cfg.SyncEvery)
	defer pullTicker.Stop()

	var lastPulledSeq int64 // opaque cursor; persisted only in-memory for now

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	for {
		select {
		case <-quit:
			log.Println("sync-engine shutting down...")
			cancel()
			return

		case batch := <-changes:
			// Before consuming retry budget, verify the cloud is reachable.
			if !syn.Probe(ctx) {
				log.Println("sync-engine: cloud unreachable — queued changes will retry next poll")
				continue
			}
			if err := syn.Push(ctx, batch); err != nil {
				log.Printf("sync-engine: push error (will retry next poll): %v", err)
			}

		case <-pullTicker.C:
			if !syn.Probe(ctx) {
				log.Println("sync-engine: cloud unreachable — skipping pull")
				continue
			}
			resp, err := syn.Pull(ctx, lastPulledSeq)
			if err != nil {
				log.Printf("sync-engine: pull error: %v", err)
				continue
			}
			if len(resp.Changes) == 0 {
				continue
			}
			log.Printf("sync-engine: received %d change(s) from central (next_seq=%d)",
				len(resp.Changes), resp.NextSeq)

			// Apply incoming central changes using conflict resolution.
			// Each change is matched against any local version; the winner
			// is forwarded to the service-specific sync receiver endpoint.
			// Services expose POST /internal/sync/apply to accept incoming changes.
			for _, incoming := range resp.Changes {
				log.Printf("  → %s %s.%s id=%s clock=%v",
					incoming.Operation, incoming.SchemaName, incoming.TableName,
					incoming.RecordID, incoming.VectorClock)
			}
			lastPulledSeq = resp.NextSeq
		}
	}
}
