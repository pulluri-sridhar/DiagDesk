package com.diagdesk.catalog.repository;

import com.diagdesk.catalog.entity.RateCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RateCardRepository extends JpaRepository<RateCard, String> {

    @Query("""
            SELECT r FROM RateCard r
            WHERE r.tenantId = :tenantId
              AND (:type IS NULL OR CAST(r.type AS string) = :type)
              AND (:branchId IS NULL OR r.branchId = :branchId)
              AND (:partnerId IS NULL OR r.partnerId = :partnerId)
              AND (:activeOn IS NULL OR
                   (r.effectiveFrom IS NULL OR r.effectiveFrom <= :activeOn)
                AND (r.effectiveTo IS NULL OR r.effectiveTo >= :activeOn))
            ORDER BY r.name ASC
            """)
    List<RateCard> findFiltered(
            @Param("tenantId") String tenantId,
            @Param("type") String type,
            @Param("branchId") String branchId,
            @Param("partnerId") String partnerId,
            @Param("activeOn") LocalDate activeOn);

    /**
     * Resolve rate card for a B2B partner — most-recently-effective card wins.
     */
    @Query("""
            SELECT r FROM RateCard r
            WHERE r.tenantId = :tenantId
              AND r.partnerId = :partnerId
              AND (r.effectiveFrom IS NULL OR r.effectiveFrom <= :today)
              AND (r.effectiveTo   IS NULL OR r.effectiveTo   >= :today)
            ORDER BY r.effectiveFrom DESC
            """)
    Optional<RateCard> findActiveB2bCard(
            @Param("tenantId") String tenantId,
            @Param("partnerId") String partnerId,
            @Param("today") LocalDate today);

    @Query("""
            SELECT r FROM RateCard r
            WHERE r.tenantId = :tenantId
              AND r.schemeCode = :schemeCode
              AND (r.effectiveFrom IS NULL OR r.effectiveFrom <= :today)
              AND (r.effectiveTo   IS NULL OR r.effectiveTo   >= :today)
            ORDER BY r.effectiveFrom DESC
            """)
    Optional<RateCard> findActiveSchemeCard(
            @Param("tenantId") String tenantId,
            @Param("schemeCode") String schemeCode,
            @Param("today") LocalDate today);

    @Query("""
            SELECT r FROM RateCard r
            WHERE r.tenantId = :tenantId
              AND r.branchId = :branchId
              AND (r.effectiveFrom IS NULL OR r.effectiveFrom <= :today)
              AND (r.effectiveTo   IS NULL OR r.effectiveTo   >= :today)
            ORDER BY r.effectiveFrom DESC
            """)
    Optional<RateCard> findActiveBranchCard(
            @Param("tenantId") String tenantId,
            @Param("branchId") String branchId,
            @Param("today") LocalDate today);
}
