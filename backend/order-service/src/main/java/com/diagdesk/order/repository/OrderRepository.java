package com.diagdesk.order.repository;

import com.diagdesk.order.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant; // still used by findTatBreaches
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, String> {

    Optional<Order> findByOrderNumber(String orderNumber);

    // status is a plain String to avoid Hibernate 6 null-enum type inference.
    // dateFrom/dateTo removed: PostgreSQL can't determine the type of null Instant params
    // in `? IS NULL` expressions — filter by date in the service layer when needed.
    @Query("""
            SELECT o FROM Order o
            WHERE o.tenantId = :tenantId
              AND (:patientId IS NULL OR o.patientId = :patientId)
              AND (:branchId  IS NULL OR o.branchId  = :branchId)
              AND (:status    IS NULL OR CAST(o.status AS string) = :status)
            ORDER BY o.createdAt DESC
            """)
    Page<Order> search(
            @Param("tenantId")  String tenantId,
            @Param("patientId") String patientId,
            @Param("branchId")  String branchId,
            @Param("status")    String status,
            Pageable pageable);

    /** Orders whose TAT has been breached and are not yet complete. */
    @Query("""
            SELECT o FROM Order o
            WHERE o.tenantId     = :tenantId
              AND (:branchId IS NULL OR o.branchId = :branchId)
              AND o.estimatedTat < :now
              AND o.status NOT IN ('complete', 'cancelled')
            ORDER BY o.estimatedTat ASC
            """)
    List<Order> findTatBreaches(
            @Param("tenantId") String tenantId,
            @Param("branchId") String branchId,
            @Param("now")      Instant now);
}
