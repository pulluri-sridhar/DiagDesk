package com.diagdesk.b2b.service;

import com.diagdesk.b2b.dto.request.CreateProfessionalContractRequest;
import com.diagdesk.b2b.entity.ProfessionalServiceContract;

import java.util.List;

public interface ProfessionalContractService {

    ProfessionalServiceContract create(CreateProfessionalContractRequest req);

    ProfessionalServiceContract getById(String contractId);

    List<ProfessionalServiceContract> list(String professionalId, String status);

    void terminate(String contractId);
}
