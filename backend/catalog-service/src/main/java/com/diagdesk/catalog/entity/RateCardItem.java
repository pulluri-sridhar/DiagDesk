package com.diagdesk.catalog.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(
    name = "rate_card_items",
    schema = "catalog",
    indexes = {
        @Index(name = "idx_rci_card",    columnList = "rate_card_id"),
        @Index(name = "idx_rci_test",    columnList = "test_id")
    }
)
@Getter @Setter @NoArgsConstructor
public class RateCardItem {

    @Id
    @Column(name = "item_id", length = 36, updatable = false)
    private String itemId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rate_card_id", nullable = false)
    private RateCard rateCard;

    /** Cross-service reference — stored as plain ID, no FK constraint. */
    @Column(name = "test_id", length = 36, nullable = false)
    private String testId;

    @Column(name = "price", precision = 10, scale = 2, nullable = false)
    private BigDecimal price;

    /** GST rate as decimal fraction (e.g. 0.18 = 18%). */
    @Column(name = "gst_rate", precision = 5, scale = 4, nullable = false)
    private BigDecimal gstRate = BigDecimal.ZERO;

    @Column(name = "is_gst_exempt", nullable = false)
    private boolean gstExempt = false;
}
