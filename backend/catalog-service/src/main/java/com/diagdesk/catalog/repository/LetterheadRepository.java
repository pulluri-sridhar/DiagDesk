package com.diagdesk.catalog.repository;

import com.diagdesk.catalog.entity.Letterhead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LetterheadRepository extends JpaRepository<Letterhead, String> {
    List<Letterhead> findAllByTenantIdOrderByCreatedAtDesc(String tenantId);
    Optional<Letterhead> findByLetterheadIdAndTenantId(String letterheadId, String tenantId);
}
