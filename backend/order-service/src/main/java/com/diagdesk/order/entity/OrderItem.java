package com.diagdesk.order.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Individual test/panel line on an order.
 * Panels are stored as-is; the device gateway explodes them into individual tests
 * when building the worklist. panel_id is kept here for UI grouping display.
 */
@Entity
@Table(
    name = "order_items",
    schema = "orders",
    indexes = {
        @Index(name = "idx_oi_order",  columnList = "order_id"),
        @Index(name = "idx_oi_test",   columnList = "test_id"),
        @Index(name = "idx_oi_panel",  columnList = "panel_id")
    }
)
@Getter @Setter @NoArgsConstructor
public class OrderItem {

    @Id
    @Column(name = "item_id", length = 36, updatable = false)
    private String itemId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    /** Cross-service reference to catalog-service test_id. */
    @Column(name = "test_id", length = 36)
    private String testId;

    /** Set when this item came from a panel/package. */
    @Column(name = "panel_id", length = 36)
    private String panelId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private ItemStatus status = ItemStatus.pending;

    public enum ItemStatus { pending, in_process, complete, cancelled }
}
