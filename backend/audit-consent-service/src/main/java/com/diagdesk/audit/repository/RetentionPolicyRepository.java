package com.diagdesk.audit.repository;

import com.diagdesk.audit.entity.RetentionPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RetentionPolicyRepository extends JpaRepository<RetentionPolicy, String> {

    List<RetentionPolicy> findByTenantIdAndActiveTrue(String tenantId);
}
