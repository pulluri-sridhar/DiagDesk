package com.diagdesk.analytics.repository;

import com.diagdesk.analytics.entity.AlertRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertRecordRepository extends JpaRepository<AlertRecord, String> {

    List<AlertRecord> findByTenantIdAndAcknowledgedFalseOrderByTriggeredAtDesc(String tenantId);

    List<AlertRecord> findByTenantIdOrderByTriggeredAtDesc(String tenantId);
}
