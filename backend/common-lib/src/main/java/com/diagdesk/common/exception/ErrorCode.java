package com.diagdesk.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/**
 * Canonical error codes across all DiagDesk microservices.
 * Format: <SERVICE_PREFIX>_<NUMBER> — enables exact-match alerting in Grafana/Loki.
 */
@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // ── Patient / MPI (PATIENT_xxx) ───────────────────────────────────────────
    PATIENT_NOT_FOUND("PATIENT_001", "Patient not found", HttpStatus.NOT_FOUND),
    PATIENT_DUPLICATE("PATIENT_002", "Potential duplicate patient detected", HttpStatus.CONFLICT),
    CONSENT_NOT_FOUND("PATIENT_003", "Consent record not found", HttpStatus.NOT_FOUND),

    // ── Catalog / Rate-card (CATALOG_xxx) ─────────────────────────────────────
    TEST_NOT_FOUND("CATALOG_001", "Test not found", HttpStatus.NOT_FOUND),
    RATE_CARD_NOT_FOUND("CATALOG_002", "Rate card not found", HttpStatus.NOT_FOUND),
    PANEL_NOT_FOUND("CATALOG_003", "Panel not found", HttpStatus.NOT_FOUND),

    // ── Order / Workflow (ORDER_xxx) ──────────────────────────────────────────
    ORDER_NOT_FOUND("ORDER_001", "Order not found", HttpStatus.NOT_FOUND),
    ORDER_ALREADY_CANCELLED("ORDER_002", "Order is already cancelled", HttpStatus.CONFLICT),
    SAMPLE_NOT_FOUND("ORDER_003", "Sample / accession not found", HttpStatus.NOT_FOUND),

    // ── Results (RESULT_xxx) ──────────────────────────────────────────────────
    RESULT_NOT_FOUND("RESULT_001", "Result not found", HttpStatus.NOT_FOUND),
    RESULT_ALREADY_SIGNED("RESULT_002", "Result is already signed off", HttpStatus.CONFLICT),

    // ── Common (COMMON_xxx) ───────────────────────────────────────────────────
    VALIDATION_ERROR("COMMON_001", "Request validation failed", HttpStatus.BAD_REQUEST),
    IDEMPOTENCY_CONFLICT("COMMON_002", "Duplicate request — already processed", HttpStatus.CONFLICT),
    UNAUTHORIZED("COMMON_003", "Authentication required", HttpStatus.UNAUTHORIZED),
    FORBIDDEN("COMMON_004", "Insufficient permissions", HttpStatus.FORBIDDEN),
    INTERNAL_ERROR("COMMON_005", "Internal server error", HttpStatus.INTERNAL_SERVER_ERROR),
    RESOURCE_NOT_FOUND("COMMON_006", "Resource not found", HttpStatus.NOT_FOUND),
    TENANT_REQUIRED("COMMON_007", "Tenant context is required", HttpStatus.BAD_REQUEST),
    INVALID_STATE_TRANSITION("COMMON_008", "Invalid state transition", HttpStatus.UNPROCESSABLE_ENTITY),
    ANTI_KICKBACK_VIOLATION("COMMON_009", "Operation violates anti-kickback compliance rules", HttpStatus.UNPROCESSABLE_ENTITY);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
