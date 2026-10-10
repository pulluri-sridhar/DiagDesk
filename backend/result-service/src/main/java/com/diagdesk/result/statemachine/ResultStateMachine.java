package com.diagdesk.result.statemachine;

import com.diagdesk.common.exception.DiagDeskException;
import com.diagdesk.common.exception.ErrorCode;
import com.diagdesk.result.entity.TestResult.ValidationStatus;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

@Component
public class ResultStateMachine {

    // Valid transitions: from → allowed "to" statuses
    private static final Map<ValidationStatus, Set<ValidationStatus>> TRANSITIONS = Map.of(
        ValidationStatus.PENDING,                    Set.of(ValidationStatus.AUTO_VALIDATED, ValidationStatus.PENDING_MANUAL_VALIDATION),
        ValidationStatus.AUTO_VALIDATED,             Set.of(ValidationStatus.PENDING_SIGNOFF),
        ValidationStatus.PENDING_MANUAL_VALIDATION,  Set.of(ValidationStatus.PENDING_SIGNOFF),
        ValidationStatus.PENDING_SIGNOFF,            Set.of(ValidationStatus.SIGNED_OFF, ValidationStatus.PENDING_RERUN),
        ValidationStatus.PENDING_RERUN,              Set.of(ValidationStatus.PENDING),
        ValidationStatus.SIGNED_OFF,                 Set.of()
    );

    public void validateTransition(ValidationStatus from, ValidationStatus to) {
        Set<ValidationStatus> allowed = TRANSITIONS.getOrDefault(from, Set.of());
        if (!allowed.contains(to)) {
            throw new DiagDeskException(ErrorCode.INVALID_STATE_TRANSITION,
                    "Cannot transition result from " + from + " to " + to);
        }
    }
}
