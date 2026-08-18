package com.diagdesk.b2b.service;

import com.diagdesk.b2b.dto.request.CreatePartnerRequest;
import com.diagdesk.b2b.dto.response.PartnerResponse;
import com.diagdesk.b2b.entity.B2BInvoice;
import com.diagdesk.b2b.entity.B2BPartner;
import com.diagdesk.b2b.repository.B2BInvoiceRepository;
import com.diagdesk.b2b.repository.B2BPartnerRepository;
import com.diagdesk.common.context.TenantContext;
import com.diagdesk.common.util.UUIDv7;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Year;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class B2BPartnerServiceImpl implements B2BPartnerService {

    private final B2BPartnerRepository partnerRepository;
    private final B2BInvoiceRepository invoiceRepository;

    @Override
    @Transactional
    public PartnerResponse createPartner(CreatePartnerRequest req) {
        String tenantId = TenantContext.getTenantId();
        B2BPartner p = new B2BPartner();
        p.setPartnerId(UUIDv7.generate());
        p.setTenantId(tenantId);
        applyRequest(p, req);
        long count = partnerRepository.countByTenantId(tenantId);
        p.setAccountNumber("B2B-" + Year.now().getValue() + "-" + String.format("%04d", count + 1));
        return toResponse(partnerRepository.save(p), BigDecimal.ZERO);
    }

    @Override
    @Transactional(readOnly = true)
    public PartnerResponse getPartner(String partnerId) {
        String tenantId = TenantContext.getTenantId();
        B2BPartner p = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new IllegalArgumentException("Partner not found: " + partnerId));
        BigDecimal utilized = invoiceRepository
                .findByPartnerIdAndStatusIn(partnerId,
                        List.of(B2BInvoice.InvoiceStatus.SENT, B2BInvoice.InvoiceStatus.PARTIALLY_PAID,
                                B2BInvoice.InvoiceStatus.OVERDUE))
                .stream()
                .map(B2BInvoice::getAmountOutstanding)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return toResponse(p, utilized);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PartnerResponse> listPartners(String q, Boolean hasOverdue, int page, int size) {
        String tenantId = TenantContext.getTenantId();
        Page<B2BPartner> results = q != null
                ? partnerRepository.findByTenantIdAndNameContainingIgnoreCase(tenantId, q, PageRequest.of(page, size))
                : partnerRepository.findByTenantId(tenantId, PageRequest.of(page, size));
        return results.stream().map(p -> toResponse(p, BigDecimal.ZERO)).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PartnerResponse updatePartner(String partnerId, CreatePartnerRequest req) {
        B2BPartner p = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new IllegalArgumentException("Partner not found: " + partnerId));
        applyRequest(p, req);
        return toResponse(partnerRepository.save(p), BigDecimal.ZERO);
    }

    @Override
    @Transactional
    public void deletePartner(String partnerId) {
        B2BPartner p = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new IllegalArgumentException("Partner not found: " + partnerId));
        partnerRepository.delete(p);
    }

    private void applyRequest(B2BPartner p, CreatePartnerRequest req) {
        p.setName(req.getName());
        p.setType(B2BPartner.PartnerType.valueOf(req.getType().toUpperCase()));
        p.setContactName(req.getContactName());
        p.setContactPhone(req.getContactPhone());
        p.setContactEmail(req.getContactEmail());
        p.setAddressLine1(req.getAddressLine1());
        p.setCity(req.getCity());
        p.setState(req.getState());
        p.setPincode(req.getPincode());
        p.setGstNumber(req.getGstNumber());
        if (req.getCreditLimit() != null) p.setCreditLimit(req.getCreditLimit());
        if (req.getBillingCycle() != null) p.setBillingCycle(B2BPartner.BillingCycle.valueOf(req.getBillingCycle().toUpperCase()));
        if (req.getCreditDays() != null) p.setCreditDays(req.getCreditDays());
    }

    private PartnerResponse toResponse(B2BPartner p, BigDecimal utilized) {
        PartnerResponse r = new PartnerResponse();
        r.setPartnerId(p.getPartnerId());
        r.setTenantId(p.getTenantId());
        r.setName(p.getName());
        r.setType(p.getType().name());
        r.setContactName(p.getContactName());
        r.setContactPhone(p.getContactPhone());
        r.setContactEmail(p.getContactEmail());
        r.setAddressLine1(p.getAddressLine1());
        r.setCity(p.getCity());
        r.setState(p.getState());
        r.setPincode(p.getPincode());
        r.setGstNumber(p.getGstNumber());
        r.setCreditLimit(p.getCreditLimit());
        r.setBillingCycle(p.getBillingCycle().name());
        r.setCreditDays(p.getCreditDays());
        r.setAccountNumber(p.getAccountNumber());
        r.setCreditUtilized(utilized);
        r.setCreditAvailable(p.getCreditLimit().subtract(utilized));
        return r;
    }
}
