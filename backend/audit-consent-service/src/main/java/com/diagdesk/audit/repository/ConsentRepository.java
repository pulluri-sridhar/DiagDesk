package com.diagdesk.audit.repository;

import com.diagdesk.audit.entity.Consent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConsentRepository extends JpaRepository<Consent, String> {

    List<Consent> findByPatientId(String patientId);

    List<Consent> findByTenantIdAndStatus(String tenantId, Consent.ConsentStatus status);

    long countByTenantId(String tenantId);

    long countByTenantIdAndStatus(String tenantId, Consent.ConsentStatus status);
}
