package com.diagdesk.catalog.repository;

import com.diagdesk.catalog.entity.NablCatalogueEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NablCatalogueRepository extends JpaRepository<NablCatalogueEntry, String> {

    @Query("""
            SELECT n FROM NablCatalogueEntry n
            WHERE (:q IS NULL OR
                   LOWER(n.name) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(n.nablCode) LIKE LOWER(CONCAT('%', :q, '%')))
              AND (:category IS NULL OR n.category = :category)
            ORDER BY n.category, n.name ASC
            """)
    Page<NablCatalogueEntry> search(
            @Param("q") String q,
            @Param("category") String category,
            Pageable pageable);
}
