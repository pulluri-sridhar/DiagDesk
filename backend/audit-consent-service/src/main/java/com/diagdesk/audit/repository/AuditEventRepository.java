package com.diagdesk.audit.repository;

import com.diagdesk.audit.entity.AuditEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AuditEventRepository extends JpaRepository<AuditEvent, String> {

    List<AuditEvent> findByTenantIdAndEntityIdOrderByTimestampAsc(String tenantId, String entityId);

    Page<AuditEvent> findByTenantIdAndEntityTypeAndEntityId(
            String tenantId, String entityType, String entityId, Pageable pageable);

    Optional<AuditEvent> findTopByTenantIdOrderByTimestampDesc(String tenantId);

    List<AuditEvent> findByTenantIdAndTimestampBetweenOrderByTimestampAsc(
            String tenantId, OffsetDateTime from, OffsetDateTime to);

    Page<AuditEvent> findByTenantId(String tenantId, Pageable pageable);
}
