package com.diagdesk.b2b.service;

import com.diagdesk.b2b.dto.request.CreateProfessionalContractRequest;
import com.diagdesk.b2b.entity.ProfessionalServiceContract;
import com.diagdesk.b2b.repository.ProfessionalServiceContractRepository;
import com.diagdesk.common.context.TenantContext;
import com.diagdesk.common.exception.DiagDeskException;
import com.diagdesk.common.exception.ErrorCode;
import com.diagdesk.common.util.UUIDv7;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProfessionalContractServiceImpl implements ProfessionalContractService {

    private final ProfessionalServiceContractRepository contractRepository;

    @Override
    @Transactional
    public ProfessionalServiceContract create(CreateProfessionalContractRequest req) {
        if ("per_referral".equalsIgnoreCase(req.getFeeType())) {
            throw new DiagDeskException(ErrorCode.VALIDATION_ERROR,
                    "per_referral fee type is not permitted. Anti-kickback policy violation.");
        }

        ProfessionalServiceContract c = new ProfessionalServiceContract();
        c.setContractId(UUIDv7.generate());
        c.setTenantId(TenantContext.getTenantId());
        c.setProfessionalId(req.getProfessionalId());
        c.setProfessionalName(req.getProfessionalName());
        c.setServiceDescription(req.getServiceDescription());
        c.setFeeType(ProfessionalServiceContract.FeeType.valueOf(req.getFeeType().toUpperCase()));
        c.setAmount(req.getAmount());
        c.setFrequency(req.getFrequency());
        c.setEffectiveFrom(req.getEffectiveFrom());
        c.setEffectiveTo(req.getEffectiveTo());
        c.setStatus(ProfessionalServiceContract.ContractStatus.ACTIVE);
        return contractRepository.save(c);
    }

    @Override
    @Transactional(readOnly = true)
    public ProfessionalServiceContract getById(String contractId) {
        return contractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Contract not found: " + contractId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProfessionalServiceContract> list(String professionalId, String status) {
        if (professionalId != null) {
            return contractRepository.findByProfessionalId(professionalId);
        }
        if (status != null) {
            return contractRepository.findByTenantIdAndStatus(
                    TenantContext.getTenantId(),
                    ProfessionalServiceContract.ContractStatus.valueOf(status.toUpperCase()));
        }
        return contractRepository.findByTenantIdAndStatus(
                TenantContext.getTenantId(),
                ProfessionalServiceContract.ContractStatus.ACTIVE);
    }

    @Override
    @Transactional
    public void terminate(String contractId) {
        ProfessionalServiceContract c = getById(contractId);
        c.setStatus(ProfessionalServiceContract.ContractStatus.TERMINATED);
        contractRepository.save(c);
    }
}
