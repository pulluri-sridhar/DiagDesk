package com.diagdesk.b2b.repository;

import com.diagdesk.b2b.entity.B2BPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface B2BPaymentRepository extends JpaRepository<B2BPayment, String> {

    List<B2BPayment> findByInvoiceId(String invoiceId);

    List<B2BPayment> findByTenantIdOrderByRecordedAtDesc(String tenantId);
}
