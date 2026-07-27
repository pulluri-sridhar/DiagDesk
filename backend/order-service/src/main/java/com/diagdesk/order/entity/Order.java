package com.diagdesk.order.entity;

import com.diagdesk.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SQLRestriction;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "orders",
    schema = "orders",
    indexes = {
        @Index(name = "idx_order_tenant",    columnList = "tenant_id"),
        @Index(name = "idx_order_patient",   columnList = "patient_id"),
        @Index(name = "idx_order_branch",    columnList = "branch_id"),
        @Index(name = "idx_order_status",    columnList = "tenant_id, status"),
        @Index(name = "idx_order_number",    columnList = "order_number", unique = true)
    }
)
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @NoArgsConstructor
public class Order extends BaseEntity {

    @Id
    @Column(name = "order_id", length = 36, updatable = false)
    private String orderId;

    @Column(name = "order_number", length = 20, nullable = false, unique = true)
    private String orderNumber;

    @Column(name = "patient_id", length = 36, nullable = false)
    private String patientId;

    @Column(name = "branch_id", length = 36, nullable = false)
    private String branchId;

    @Column(name = "b2b_partner_id", length = 36)
    private String b2bPartnerId;

    @Column(name = "referred_by_doctor_id", length = 36)
    private String referredByDoctorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", length = 10, nullable = false)
    private Priority priority = Priority.routine;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 25, nullable = false)
    private OrderStatus status = OrderStatus.pending_collection;

    @Enumerated(EnumType.STRING)
    @Column(name = "collection_type", length = 20, nullable = false)
    private CollectionType collectionType = CollectionType.walk_in;

    @Column(name = "clinical_notes", length = 1000)
    private String clinicalNotes;

    @Column(name = "invoice_id", length = 36)
    private String invoiceId;

    @Column(name = "estimated_tat")
    private Instant estimatedTat;

    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;

    @Column(name = "cancelled_by", length = 36)
    private String cancelledBy;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<OrderItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Sample> samples = new ArrayList<>();

    public enum Priority { routine, urgent, stat }

    public enum OrderStatus {
        pending_collection, collected, in_processing,
        partially_complete, complete, cancelled
    }

    public enum CollectionType { walk_in, home_collection, b2b }
}
