package com.diagdesk.catalog.repository;

import com.diagdesk.catalog.entity.Panel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PanelRepository extends JpaRepository<Panel, String> {

    @Query("""
            SELECT p FROM Panel p
            WHERE p.tenantId = :tenantId
              AND (:type IS NULL OR CAST(p.type AS string) = :type)
              AND (:q IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY p.name ASC
            """)
    Page<Panel> search(
            @Param("tenantId") String tenantId,
            @Param("q") String q,
            @Param("type") String type,
            Pageable pageable);
}
