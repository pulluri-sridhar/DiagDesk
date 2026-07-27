package com.diagdesk.order.statemachine;

import com.diagdesk.common.exception.DiagDeskException;
import com.diagdesk.common.exception.ErrorCode;
import com.diagdesk.order.entity.Sample.SampleStatus;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

/**
 * Sample state machine.
 *
 * Valid transitions:
 *   collected   → received, rejected
 *   received    → in_process, rejected
 *   in_process  → processed, rejected
 *   processed   → reported
 *   reported    → handed_over
 *   rejected    → collected  (re-collection)
 *   handed_over → (terminal)
 */
@Component
public class SampleStateMachine {

    private static final Map<SampleStatus, Set<SampleStatus>> TRANSITIONS = Map.of(
        SampleStatus.collected,    Set.of(SampleStatus.received, SampleStatus.rejected),
        SampleStatus.received,     Set.of(SampleStatus.in_process, SampleStatus.rejected),
        SampleStatus.in_process,   Set.of(SampleStatus.processed, SampleStatus.rejected),
        SampleStatus.processed,    Set.of(SampleStatus.reported),
        SampleStatus.reported,     Set.of(SampleStatus.handed_over),
        SampleStatus.rejected,     Set.of(SampleStatus.collected),
        SampleStatus.handed_over,  Set.of()
    );

    public void validateTransition(SampleStatus from, SampleStatus to) {
        Set<SampleStatus> allowed = TRANSITIONS.getOrDefault(from, Set.of());
        if (!allowed.contains(to)) {
            throw new DiagDeskException(ErrorCode.INVALID_STATE_TRANSITION,
                String.format("Sample cannot transition from %s to %s", from, to));
        }
    }
}
