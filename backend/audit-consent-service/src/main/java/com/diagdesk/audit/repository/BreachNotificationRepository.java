package com.diagdesk.audit.repository;

import com.diagdesk.audit.entity.BreachNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BreachNotificationRepository extends JpaRepository<BreachNotification, String> {

    List<BreachNotification> findByTenantIdOrderByCreatedAtDesc(String tenantId);

    List<BreachNotification> findByTenantIdAndStatus(String tenantId, String status);
}
