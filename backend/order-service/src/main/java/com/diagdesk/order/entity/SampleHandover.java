package com.diagdesk.order.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "sample_handovers", schema = "orders")
@Getter @Setter @NoArgsConstructor
public class SampleHandover {

    @Id
    @Column(name = "handover_id", length = 36, updatable = false)
    private String handoverId;

    @Column(name = "accession_id", length = 36, nullable = false)
    private String accessionId;

    @Column(name = "handed_over_to", length = 200)
    private String handedOverTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "method", length = 15)
    private HandoverMethod method;

    @Column(name = "barcode_scanned", length = 30)
    private String barcodeScanned;

    @Column(name = "handed_over_by", length = 36)
    private String handedOverBy;

    @Column(name = "handed_over_at", nullable = false)
    private Instant handedOverAt;

    public enum HandoverMethod { manual, barcode_scan }
}
