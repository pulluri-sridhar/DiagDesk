package com.diagdesk.catalog.repository;

import com.diagdesk.catalog.entity.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TestRepository extends JpaRepository<Test, String> {

    Optional<Test> findByTenantIdAndCode(String tenantId, String code);

    boolean existsByTenantIdAndCode(String tenantId, String code);

    boolean existsByTenantIdAndNablCode(String tenantId, String nablCode);

    @Query("""
            SELECT t FROM Test t
            WHERE t.tenantId = :tenantId
              AND (:departmentId IS NULL OR t.departmentId = :departmentId)
              AND (:isCustom IS NULL OR t.custom = :isCustom)
              AND (:q IS NULL OR
                   LOWER(t.name) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(t.code) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY t.name ASC
            """)
    Page<Test> search(
            @Param("tenantId") String tenantId,
            @Param("q") String q,
            @Param("departmentId") String departmentId,
            @Param("isCustom") Boolean isCustom,
            Pageable pageable);

    @Query("SELECT t FROM Test t WHERE t.tenantId = :tenantId ORDER BY t.name ASC")
    Page<Test> findAllByTenantId(@Param("tenantId") String tenantId, Pageable pageable);

    List<Test> findAllByTenantIdAndNablCodeIn(String tenantId, List<String> nablCodes);
}
