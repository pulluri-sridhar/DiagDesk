package com.diagdesk.b2b.repository;

import com.diagdesk.b2b.entity.B2BInvoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface B2BInvoiceRepository extends JpaRepository<B2BInvoice, String> {

    Page<B2BInvoice> findByPartnerId(String partnerId, Pageable pageable);

    List<B2BInvoice> findByTenantIdAndStatus(String tenantId, B2BInvoice.InvoiceStatus status);

    List<B2BInvoice> findByTenantIdAndStatusIn(String tenantId, List<B2BInvoice.InvoiceStatus> statuses);

    List<B2BInvoice> findByPartnerIdAndStatusIn(String partnerId, List<B2BInvoice.InvoiceStatus> statuses);

    List<B2BInvoice> findByPartnerIdOrderByDueDateAsc(String partnerId);

    long countByTenantIdAndStatus(String tenantId, B2BInvoice.InvoiceStatus status);
}
