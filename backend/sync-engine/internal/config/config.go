package config

import (
	"os"
	"strconv"
	"time"
)

// Config holds every setting the sync-engine needs.
// A struct in Go is just a named collection of fields — no methods required.
type Config struct {
	BranchID    string        // unique ID for this clinic/branch
	LocalDB     DBConfig      // local PostgreSQL (on the edge node)
	CloudURL    string        // base URL of the cloud sync API
	SyncEvery   time.Duration // how often to push/pull
	PollEvery   time.Duration // how often to check the change log
}

// DBConfig is a nested struct — structs can contain other structs.
type DBConfig struct {
	DSN string // Data Source Name: "postgres://user:pass@host:port/db"
}

// Load reads config from environment variables.
// If a variable isn't set, it falls back to a safe default for local dev.
// This is the same pattern used in device-gateway/internal/config/config.go.
func Load() *Config {
	// The * means we return a pointer to Config, not a copy.
	// Pointers are efficient — you pass the address, not the whole struct.
	return &Config{
		BranchID:  getenv("BRANCH_ID", "branch-local"),
		CloudURL:  getenv("CLOUD_SYNC_URL", "http://localhost:8090"),
		SyncEvery: getDuration("SYNC_EVERY_SECONDS", 30*time.Second),
		PollEvery: getDuration("POLL_EVERY_SECONDS", 5*time.Second),
		LocalDB: DBConfig{
			DSN: getenv("LOCAL_DB_DSN", "postgres://diagdesk:diagdesk@localhost:5432/diagdesk?sslmode=disable"),
		},
	}
}

// getenv returns the environment variable `key`, or `fallback` if not set.
// Note: Go functions can only return one type — no overloading.
func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// getDuration reads an env var as a number of seconds.
// Go functions can return multiple values — here we return (time.Duration, error).
// When we don't care about the error we use _ to discard it.
func getDuration(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	secs, err := strconv.Atoi(v) // Atoi = "ASCII to integer"
	if err != nil {
		return fallback // if it's not a valid number, use the default
	}
	return time.Duration(secs) * time.Second
}
