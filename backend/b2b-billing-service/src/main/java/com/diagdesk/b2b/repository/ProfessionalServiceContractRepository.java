package com.diagdesk.b2b.repository;

import com.diagdesk.b2b.entity.ProfessionalServiceContract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProfessionalServiceContractRepository
        extends JpaRepository<ProfessionalServiceContract, String> {

    List<ProfessionalServiceContract> findByTenantIdAndStatus(
            String tenantId, ProfessionalServiceContract.ContractStatus status);

    List<ProfessionalServiceContract> findByProfessionalId(String professionalId);
}
