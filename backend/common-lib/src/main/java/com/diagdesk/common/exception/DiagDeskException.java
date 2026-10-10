package com.diagdesk.common.exception;

import lombok.Getter;

import java.util.List;

/**
 * Base exception for all DiagDesk domain errors.
 * Carries a typed ErrorCode so the GlobalExceptionHandler can map it to the
 * correct HTTP status and error envelope without instanceof chains.
 */
@Getter
public class DiagDeskException extends RuntimeException {

    private final ErrorCode errorCode;
    private final List<String> details;

    public DiagDeskException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
        this.details = List.of();
    }

    public DiagDeskException(ErrorCode errorCode, String detail) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
        this.details = List.of(detail);
    }

    public DiagDeskException(ErrorCode errorCode, List<String> details) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
        this.details = details;
    }

    public DiagDeskException(ErrorCode errorCode, Throwable cause) {
        super(errorCode.getMessage(), cause);
        this.errorCode = errorCode;
        this.details = List.of();
    }
}
