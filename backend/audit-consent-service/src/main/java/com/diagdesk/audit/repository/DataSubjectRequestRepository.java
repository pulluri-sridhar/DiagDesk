package com.diagdesk.audit.repository;

import com.diagdesk.audit.entity.DataSubjectRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DataSubjectRequestRepository extends JpaRepository<DataSubjectRequest, String> {

    Page<DataSubjectRequest> findByTenantIdAndStatus(
            String tenantId, DataSubjectRequest.DsrStatus status, Pageable pageable);

    Page<DataSubjectRequest> findByTenantId(String tenantId, Pageable pageable);

    List<DataSubjectRequest> findByPatientId(String patientId);
}
