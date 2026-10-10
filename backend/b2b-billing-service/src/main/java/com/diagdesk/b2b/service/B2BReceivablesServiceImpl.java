package com.diagdesk.b2b.service;

import com.diagdesk.b2b.dto.request.LogFollowUpRequest;
import com.diagdesk.b2b.entity.B2BInvoice;
import com.diagdesk.b2b.entity.B2BPartner;
import com.diagdesk.b2b.entity.FollowUp;
import com.diagdesk.b2b.repository.B2BInvoiceRepository;
import com.diagdesk.b2b.repository.B2BPartnerRepository;
import com.diagdesk.b2b.repository.FollowUpRepository;
import com.diagdesk.common.exception.DiagDeskException;
import com.diagdesk.common.exception.ErrorCode;
import com.diagdesk.common.security.TenantContext;
import com.diagdesk.common.util.UUIDv7;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class B2BReceivablesServiceImpl implements B2BReceivablesService {

    private static final List<B2BInvoice.InvoiceStatus> OPEN_STATUSES = List.of(
            B2BInvoice.InvoiceStatus.SENT,
            B2BInvoice.InvoiceStatus.PARTIALLY_PAID,
            B2BInvoice.InvoiceStatus.OVERDUE
    );

    private final B2BInvoiceRepository invoiceRepository;
    private final B2BPartnerRepository partnerRepository;
    private final FollowUpRepository followUpRepository;

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> agingReport() {
        String tenantId = TenantContext.getTenantId();
        List<B2BInvoice> openInvoices = invoiceRepository.findByTenantIdAndStatusIn(tenantId, OPEN_STATUSES);
        LocalDate today = LocalDate.now();

        Map<String, List<Map<String, Object>>> buckets = new LinkedHashMap<>();
        buckets.put("current",     new ArrayList<>());
        buckets.put("overdue_030", new ArrayList<>());
        buckets.put("overdue_3160", new ArrayList<>());
        buckets.put("overdue_6190", new ArrayList<>());
        buckets.put("overdue_90plus", new ArrayList<>());

        BigDecimal totalOutstanding = BigDecimal.ZERO;

        for (B2BInvoice inv : openInvoices) {
            long daysOverdue = inv.getDueDate() != null
                    ? ChronoUnit.DAYS.between(inv.getDueDate(), today)
                    : 0L;
            Map<String, Object> row = invoiceAgingRow(inv, daysOverdue);
            totalOutstanding = totalOutstanding.add(inv.getAmountOutstanding());

            String bucket;
            if (daysOverdue <= 0)        bucket = "current";
            else if (daysOverdue <= 30)  bucket = "overdue_030";
            else if (daysOverdue <= 60)  bucket = "overdue_3160";
            else if (daysOverdue <= 90)  bucket = "overdue_6190";
            else                         bucket = "overdue_90plus";

            buckets.get(bucket).add(row);
        }

        Map<String, BigDecimal> bucketTotals = new LinkedHashMap<>();
        buckets.forEach((k, v) -> bucketTotals.put(k,
                v.stream().map(r -> (BigDecimal) r.get("amountOutstanding"))
                        .reduce(BigDecimal.ZERO, BigDecimal::add)));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("generatedAt",      java.time.OffsetDateTime.now().toString());
        result.put("totalOutstanding",  totalOutstanding);
        result.put("bucketTotals",      bucketTotals);
        result.put("invoices",          buckets);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> accountStatement(String partnerId, LocalDate from, LocalDate to) {
        B2BPartner partner = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new DiagDeskException(ErrorCode.RESOURCE_NOT_FOUND, "Partner not found: " + partnerId));

        List<B2BInvoice> invoices = invoiceRepository.findByPartnerIdOrderByDueDateAsc(partnerId)
                .stream()
                .filter(inv -> {
                    LocalDate d = inv.getDueDate() != null ? inv.getDueDate() : inv.getCreatedAt().toLocalDate();
                    return !d.isBefore(from) && !d.isAfter(to);
                })
                .toList();

        BigDecimal totalBilled      = invoices.stream().map(B2BInvoice::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPaid        = invoices.stream().map(B2BInvoice::getAmountPaid).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalOutstanding = invoices.stream().map(B2BInvoice::getAmountOutstanding).reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Map<String, Object>> rows = invoices.stream().map(inv -> {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("invoiceId",         inv.getInvoiceId());
            r.put("invoiceNumber",     inv.getInvoiceNumber());
            r.put("dueDate",           inv.getDueDate());
            r.put("totalAmount",       inv.getTotalAmount());
            r.put("amountPaid",        inv.getAmountPaid());
            r.put("amountOutstanding", inv.getAmountOutstanding());
            r.put("status",            inv.getStatus().name());
            return r;
        }).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("partnerId",        partner.getPartnerId());
        result.put("partnerName",      partner.getName());
        result.put("accountNumber",    partner.getAccountNumber());
        result.put("creditLimit",      partner.getCreditLimit());
        result.put("periodFrom",       from);
        result.put("periodTo",         to);
        result.put("totalBilled",      totalBilled);
        result.put("totalPaid",        totalPaid);
        result.put("totalOutstanding", totalOutstanding);
        result.put("invoices",         rows);
        return result;
    }

    @Override
    @Transactional
    public Map<String, Object> logFollowUp(LogFollowUpRequest req) {
        String tenantId = TenantContext.getTenantId();
        FollowUp fu = new FollowUp();
        fu.setFollowUpId(UUIDv7.generateAsString());
        fu.setTenantId(tenantId);
        fu.setPartnerId(req.getPartnerId());
        fu.setInvoiceId(req.getInvoiceId());
        fu.setActionType(FollowUp.ActionType.valueOf(req.getActionType().toUpperCase()));
        fu.setNotes(req.getNotes());
        fu.setNextFollowUpDate(req.getNextFollowUpDate());
        followUpRepository.save(fu);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("followUpId",       fu.getFollowUpId());
        result.put("partnerId",        fu.getPartnerId());
        result.put("actionType",       fu.getActionType().name());
        result.put("nextFollowUpDate", fu.getNextFollowUpDate());
        result.put("createdAt",        fu.getCreatedAt());
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listFollowUps(String partnerId) {
        return followUpRepository.findByPartnerIdOrderByCreatedAtDesc(partnerId).stream()
                .map(fu -> {
                    Map<String, Object> r = new LinkedHashMap<>();
                    r.put("followUpId",       fu.getFollowUpId());
                    r.put("partnerId",        fu.getPartnerId());
                    r.put("invoiceId",        fu.getInvoiceId());
                    r.put("actionType",       fu.getActionType().name());
                    r.put("notes",            fu.getNotes());
                    r.put("nextFollowUpDate", fu.getNextFollowUpDate());
                    r.put("createdAt",        fu.getCreatedAt());
                    return r;
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public Map<String, Object> updateCreditLimit(String partnerId, BigDecimal newLimit) {
        B2BPartner partner = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new DiagDeskException(ErrorCode.RESOURCE_NOT_FOUND, "Partner not found: " + partnerId));
        partner.setCreditLimit(newLimit);
        partnerRepository.save(partner);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("partnerId",    partner.getPartnerId());
        result.put("name",         partner.getName());
        result.put("creditLimit",  partner.getCreditLimit());
        return result;
    }

    private Map<String, Object> invoiceAgingRow(B2BInvoice inv, long daysOverdue) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("invoiceId",         inv.getInvoiceId());
        r.put("invoiceNumber",     inv.getInvoiceNumber());
        r.put("partnerId",         inv.getPartnerId());
        r.put("dueDate",           inv.getDueDate());
        r.put("amountOutstanding", inv.getAmountOutstanding());
        r.put("daysOverdue",       Math.max(0, daysOverdue));
        r.put("status",            inv.getStatus().name());
        return r;
    }
}
