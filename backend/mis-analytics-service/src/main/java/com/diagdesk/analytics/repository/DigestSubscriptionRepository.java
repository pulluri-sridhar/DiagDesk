package com.diagdesk.analytics.repository;

import com.diagdesk.analytics.entity.DigestSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DigestSubscriptionRepository extends JpaRepository<DigestSubscription, String> {

    List<DigestSubscription> findByTenantIdAndActiveTrue(String tenantId);

    Optional<DigestSubscription> findByTenantIdAndUserId(String tenantId, String userId);
}
