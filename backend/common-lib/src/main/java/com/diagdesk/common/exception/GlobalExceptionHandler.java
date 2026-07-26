package com.diagdesk.common.exception;

import com.diagdesk.common.dto.ErrorDetail;
import com.diagdesk.common.dto.ErrorResponse;
import io.micrometer.tracing.Tracer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Central error handler — converts every exception type to the standard
 * { "error": { code, message, details[] }, timestamp, traceId } envelope.
 *
 * All services that include common-lib get this handler automatically via
 * Spring Boot component-scan.
 */
@Slf4j
@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private final Tracer tracer;

    // ── Domain errors ─────────────────────────────────────────────────────────

    @ExceptionHandler(DiagDeskException.class)
    public ResponseEntity<ErrorResponse> handleDomain(DiagDeskException ex) {
        log.warn("Domain exception [{}]: {}", ex.getErrorCode().getCode(), ex.getMessage());
        List<ErrorDetail> details = ex.getDetails().stream()
                .map(d -> ErrorDetail.builder().message(d).build())
                .collect(Collectors.toList());
        return ResponseEntity
                .status(ex.getErrorCode().getHttpStatus())
                .body(build(ex.getErrorCode(), details));
    }

    // ── Validation errors ─────────────────────────────────────────────────────

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        List<ErrorDetail> details = ex.getBindingResult().getAllErrors().stream()
                .map(err -> {
                    if (err instanceof FieldError fe) {
                        return ErrorDetail.builder().field(fe.getField()).message(fe.getDefaultMessage()).build();
                    }
                    return ErrorDetail.builder().message(err.getDefaultMessage()).build();
                })
                .collect(Collectors.toList());
        return ResponseEntity.badRequest().body(build(ErrorCode.VALIDATION_ERROR, details));
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<ErrorResponse> handleMissingHeader(MissingRequestHeaderException ex) {
        return ResponseEntity.badRequest()
                .body(build(ErrorCode.VALIDATION_ERROR,
                        List.of(ErrorDetail.builder().field(ex.getHeaderName())
                                .message("Required header is missing").build())));
    }

    // ── Security ──────────────────────────────────────────────────────────────

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuth(AuthenticationException ex) {
        return ResponseEntity.status(401).body(build(ErrorCode.UNAUTHORIZED, List.of()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccess(AccessDeniedException ex) {
        return ResponseEntity.status(403).body(build(ErrorCode.FORBIDDEN, List.of()));
    }

    // ── Catch-all ─────────────────────────────────────────────────────────────

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.internalServerError().body(build(ErrorCode.INTERNAL_ERROR, List.of()));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private ErrorResponse build(ErrorCode code, List<ErrorDetail> details) {
        String traceId = resolveTraceId();
        return ErrorResponse.builder()
                .error(ErrorResponse.Error.builder()
                        .code(code.getCode())
                        .message(code.getMessage())
                        .details(details.isEmpty() ? null : details)
                        .build())
                .timestamp(Instant.now())
                .traceId(traceId)
                .build();
    }

    private String resolveTraceId() {
        try {
            if (tracer != null && tracer.currentSpan() != null) {
                return tracer.currentSpan().context().traceId();
            }
        } catch (Exception ignored) {}
        return null;
    }
}
