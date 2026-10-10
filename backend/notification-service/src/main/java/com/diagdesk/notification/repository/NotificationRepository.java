package com.diagdesk.notification.repository;

import com.diagdesk.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {

    Page<Notification> findByRecipientId(String recipientId, Pageable pageable);

    List<Notification> findByStatusAndRetryCountLessThan(
            Notification.NotificationStatus status, int maxRetries);

    long countByChannelAndStatusAndQueuedAtBetween(
            Notification.Channel channel,
            Notification.NotificationStatus status,
            OffsetDateTime from,
            OffsetDateTime to);
}
