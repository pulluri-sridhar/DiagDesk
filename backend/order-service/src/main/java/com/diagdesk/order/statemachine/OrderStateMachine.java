package com.diagdesk.order.statemachine;

import com.diagdesk.common.exception.DiagDeskException;
import com.diagdesk.common.exception.ErrorCode;
import com.diagdesk.order.entity.Order.OrderStatus;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

/**
 * Order state machine — encodes all valid status transitions.
 *
 * Designed to be wired to Spring State Machine when infrastructure is ready.
 * Currently implemented as a lightweight transition table to avoid Spring State Machine
 * dependency on a scaffold build.
 *
 * Valid transitions:
 *   pending_collection → collected, cancelled
 *   collected          → in_processing, cancelled
 *   in_processing      → partially_complete, complete
 *   partially_complete → complete
 *   complete           → (terminal)
 *   cancelled          → (terminal)
 */
@Component
public class OrderStateMachine {

    private static final Map<OrderStatus, Set<OrderStatus>> TRANSITIONS = Map.of(
        OrderStatus.pending_collection, Set.of(OrderStatus.collected, OrderStatus.cancelled),
        OrderStatus.collected,          Set.of(OrderStatus.in_processing, OrderStatus.cancelled),
        OrderStatus.in_processing,      Set.of(OrderStatus.partially_complete, OrderStatus.complete),
        OrderStatus.partially_complete, Set.of(OrderStatus.complete),
        OrderStatus.complete,           Set.of(),
        OrderStatus.cancelled,          Set.of()
    );

    public void validateTransition(OrderStatus from, OrderStatus to) {
        Set<OrderStatus> allowed = TRANSITIONS.getOrDefault(from, Set.of());
        if (!allowed.contains(to)) {
            throw new DiagDeskException(ErrorCode.INVALID_STATE_TRANSITION,
                String.format("Order cannot transition from %s to %s", from, to));
        }
    }

    public boolean canCancel(OrderStatus status) {
        return TRANSITIONS.getOrDefault(status, Set.of()).contains(OrderStatus.cancelled);
    }
}
