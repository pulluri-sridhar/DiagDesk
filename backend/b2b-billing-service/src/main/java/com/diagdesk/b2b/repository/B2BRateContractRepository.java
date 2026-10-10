package com.diagdesk.b2b.repository;

import com.diagdesk.b2b.entity.B2BRateContract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface B2BRateContractRepository extends JpaRepository<B2BRateContract, String> {

    List<B2BRateContract> findByPartnerIdAndStatus(
            String partnerId, B2BRateContract.ContractStatus status);

    List<B2BRateContract> findByPartnerId(String partnerId);
}
