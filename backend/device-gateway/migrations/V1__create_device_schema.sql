-- ============================================================
-- Device Integration Gateway — PostgreSQL Schema
-- Schema: devices
-- ============================================================

CREATE SCHEMA IF NOT EXISTS devices;

-- ── Device Connections ────────────────────────────────────────────────────────
-- One row per registered analyzer. Status is kept in-sync by the socket manager.

CREATE TABLE devices.device_connections (
    connection_id   VARCHAR(36)  PRIMARY KEY,
    tenant_id       VARCHAR(36)  NOT NULL,
    branch_id       VARCHAR(36)  NOT NULL,
    department_id   VARCHAR(36),
    analyzer_id     VARCHAR(100) NOT NULL,
    display_name    VARCHAR(200) NOT NULL,
    protocol        VARCHAR(20)  NOT NULL
                        CHECK (protocol IN ('HL7_v2', 'ASTM_1394')),
    host            VARCHAR(255) NOT NULL,
    port            INTEGER      NOT NULL,
    model           VARCHAR(200),
    serial_number   VARCHAR(100),
    status          VARCHAR(20)  NOT NULL DEFAULT 'disconnected'
                        CHECK (status IN ('connected', 'disconnected', 'error')),
    last_seen_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ,

    UNIQUE (tenant_id, analyzer_id)
);

CREATE INDEX idx_dc_tenant  ON devices.device_connections (tenant_id);
CREATE INDEX idx_dc_branch  ON devices.device_connections (branch_id);
CREATE INDEX idx_dc_status  ON devices.device_connections (tenant_id, status);

-- ── Device Messages ───────────────────────────────────────────────────────────
-- Stores every raw HL7/ASTM message received from an analyzer.
-- status = matched   → auto-matched to an accession; result.raw Kafka event sent
-- status = unmatched → queued for manual review via /v1/unmatched-results
-- status = error     → parse failure; raw_message preserved for troubleshooting

CREATE TABLE devices.device_messages (
    message_id              VARCHAR(36)  PRIMARY KEY,
    connection_id           VARCHAR(36)  NOT NULL
                                REFERENCES devices.device_connections (connection_id),
    tenant_id               VARCHAR(36)  NOT NULL,
    raw_message             TEXT         NOT NULL,
    protocol                VARCHAR(20)  NOT NULL,
    status                  VARCHAR(20)  NOT NULL DEFAULT 'unmatched'
                                CHECK (status IN ('matched', 'unmatched', 'error')),
    matched_accession_id    VARCHAR(36),
    patient_name_in_message VARCHAR(200),
    test_code               VARCHAR(50),
    value                   VARCHAR(100),
    unit                    VARCHAR(50),
    received_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    matched_at              TIMESTAMPTZ,
    matched_by              VARCHAR(36)   -- user_id who manually matched, null if auto
);

CREATE INDEX idx_dm_connection ON devices.device_messages (connection_id);
CREATE INDEX idx_dm_tenant     ON devices.device_messages (tenant_id);
CREATE INDEX idx_dm_status     ON devices.device_messages (tenant_id, status);
CREATE INDEX idx_dm_received   ON devices.device_messages (received_at DESC);
CREATE INDEX idx_dm_unmatched  ON devices.device_messages (tenant_id, received_at DESC)
    WHERE status = 'unmatched';
