-- DiagDesk local development PostgreSQL init
-- Runs once when the container is first created.
-- The `diagdesk` database is already created by POSTGRES_DB env var;
-- this script creates all ten service schemas inside it.

\c diagdesk;

-- ── Original 5 services ───────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS patient;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS orders;
CREATE SCHEMA IF NOT EXISTS results;
CREATE SCHEMA IF NOT EXISTS devices;

-- ── Additional 5 services ─────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS reporting;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS b2b;

-- Grant the diagdesk user full access to all schemas
GRANT ALL PRIVILEGES ON SCHEMA patient        TO diagdesk;
GRANT ALL PRIVILEGES ON SCHEMA catalog        TO diagdesk;
GRANT ALL PRIVILEGES ON SCHEMA orders         TO diagdesk;
GRANT ALL PRIVILEGES ON SCHEMA results        TO diagdesk;
GRANT ALL PRIVILEGES ON SCHEMA devices        TO diagdesk;
GRANT ALL PRIVILEGES ON SCHEMA reporting      TO diagdesk;
GRANT ALL PRIVILEGES ON SCHEMA analytics      TO diagdesk;
GRANT ALL PRIVILEGES ON SCHEMA notifications  TO diagdesk;
GRANT ALL PRIVILEGES ON SCHEMA audit          TO diagdesk;
GRANT ALL PRIVILEGES ON SCHEMA b2b            TO diagdesk;

-- Default privileges for future tables created by Flyway migrations
ALTER DEFAULT PRIVILEGES IN SCHEMA patient        GRANT ALL ON TABLES    TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA catalog        GRANT ALL ON TABLES    TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA orders         GRANT ALL ON TABLES    TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA results        GRANT ALL ON TABLES    TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA devices        GRANT ALL ON TABLES    TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA reporting      GRANT ALL ON TABLES    TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics      GRANT ALL ON TABLES    TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA notifications  GRANT ALL ON TABLES    TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit          GRANT ALL ON TABLES    TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA b2b            GRANT ALL ON TABLES    TO diagdesk;

ALTER DEFAULT PRIVILEGES IN SCHEMA patient        GRANT ALL ON SEQUENCES TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA catalog        GRANT ALL ON SEQUENCES TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA orders         GRANT ALL ON SEQUENCES TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA results        GRANT ALL ON SEQUENCES TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA devices        GRANT ALL ON SEQUENCES TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA reporting      GRANT ALL ON SEQUENCES TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics      GRANT ALL ON SEQUENCES TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA notifications  GRANT ALL ON SEQUENCES TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit          GRANT ALL ON SEQUENCES TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA b2b            GRANT ALL ON SEQUENCES TO diagdesk;
