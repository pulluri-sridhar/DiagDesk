package com.diagdesk.notification.repository;

import com.diagdesk.notification.entity.NotificationTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationTemplateRepository extends JpaRepository<NotificationTemplate, String> {

    List<NotificationTemplate> findByChannel(NotificationTemplate.Channel channel);

    List<NotificationTemplate> findByTenantIdAndChannel(String tenantId, NotificationTemplate.Channel channel);

    List<NotificationTemplate> findByTenantId(String tenantId);
}
