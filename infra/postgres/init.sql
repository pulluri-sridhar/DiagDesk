-- DiagDesk local development PostgreSQL init
-- Runs once when the container is first created.
-- The `diagdesk` database is already created by POSTGRES_DB env var;
-- this script just creates the five service schemas inside it.

\c diagdesk;

CREATE SCHEMA IF NOT EXISTS patient;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS orders;
CREATE SCHEMA IF NOT EXISTS results;
CREATE SCHEMA IF NOT EXISTS devices;

-- Grant the diagdesk user full access to all schemas
GRANT ALL PRIVILEGES ON SCHEMA patient  TO diagdesk;
GRANT ALL PRIVILEGES ON SCHEMA catalog  TO diagdesk;
GRANT ALL PRIVILEGES ON SCHEMA orders   TO diagdesk;
GRANT ALL PRIVILEGES ON SCHEMA results  TO diagdesk;
GRANT ALL PRIVILEGES ON SCHEMA devices  TO diagdesk;

-- Default privileges for future tables created by Flyway migrations
ALTER DEFAULT PRIVILEGES IN SCHEMA patient  GRANT ALL ON TABLES    TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA catalog  GRANT ALL ON TABLES    TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA orders   GRANT ALL ON TABLES    TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA results  GRANT ALL ON TABLES    TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA devices  GRANT ALL ON TABLES    TO diagdesk;

ALTER DEFAULT PRIVILEGES IN SCHEMA patient  GRANT ALL ON SEQUENCES TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA catalog  GRANT ALL ON SEQUENCES TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA orders   GRANT ALL ON SEQUENCES TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA results  GRANT ALL ON SEQUENCES TO diagdesk;
ALTER DEFAULT PRIVILEGES IN SCHEMA devices  GRANT ALL ON SEQUENCES TO diagdesk;
