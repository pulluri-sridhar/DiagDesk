package com.diagdesk.b2b.service;

import com.diagdesk.b2b.dto.request.RecordPaymentRequest;
import com.diagdesk.b2b.dto.response.InvoiceResponse;
import com.diagdesk.b2b.entity.B2BInvoice;
import com.diagdesk.b2b.entity.B2BPayment;
import com.diagdesk.b2b.kafka.B2BEventProducer;
import com.diagdesk.b2b.repository.B2BInvoiceRepository;
import com.diagdesk.b2b.repository.B2BPaymentRepository;
import com.diagdesk.common.exception.DiagDeskException;
import com.diagdesk.common.exception.ErrorCode;
import com.diagdesk.common.security.TenantContext;
import com.diagdesk.common.util.UUIDv7;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class B2BInvoiceServiceImpl implements B2BInvoiceService {

    private final B2BInvoiceRepository invoiceRepository;
    private final B2BPaymentRepository paymentRepository;
    private final B2BEventProducer eventProducer;

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceResponse> listInvoices(String partnerId, String status, int page, int size) {
        if (partnerId != null) {
            return invoiceRepository.findByPartnerId(partnerId, PageRequest.of(page, size))
                    .stream().map(this::toResponse).collect(Collectors.toList());
        }
        if (status != null) {
            return invoiceRepository.findByTenantIdAndStatus(
                    TenantContext.getTenantId(),
                    B2BInvoice.InvoiceStatus.valueOf(status.toUpperCase()))
                    .stream().map(this::toResponse).collect(Collectors.toList());
        }
        return invoiceRepository.findAll(PageRequest.of(page, size))
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoice(String invoiceId) {
        return invoiceRepository.findById(invoiceId)
                .map(this::toResponse)
                .orElseThrow(() -> new DiagDeskException(ErrorCode.RESOURCE_NOT_FOUND, "Invoice not found: " + invoiceId));
    }

    @Override
    @Transactional
    public InvoiceResponse sendInvoice(String invoiceId, List<String> channels) {
        B2BInvoice inv = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new DiagDeskException(ErrorCode.RESOURCE_NOT_FOUND, "Invoice not found: " + invoiceId));
        inv.setStatus(B2BInvoice.InvoiceStatus.SENT);
        inv.setSentAt(OffsetDateTime.now());
        invoiceRepository.save(inv);
        eventProducer.publishInvoiceCreated(inv);
        return toResponse(inv);
    }

    @Override
    @Transactional
    public InvoiceResponse recordPayment(String invoiceId, RecordPaymentRequest req) {
        B2BInvoice inv = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new DiagDeskException(ErrorCode.RESOURCE_NOT_FOUND, "Invoice not found: " + invoiceId));

        B2BPayment payment = new B2BPayment();
        payment.setPaymentId(UUIDv7.generateAsString());
        payment.setInvoiceId(invoiceId);
        payment.setTenantId(inv.getTenantId());
        payment.setAmount(req.getAmount());
        payment.setPaymentDate(req.getPaymentDate());
        if (req.getPaymentMode() != null) {
            payment.setPaymentMode(B2BPayment.PaymentMode.valueOf(req.getPaymentMode().toUpperCase()));
        }
        payment.setReferenceNumber(req.getReferenceNumber());
        payment.setNotes(req.getNotes());
        paymentRepository.save(payment);

        inv.setAmountPaid(inv.getAmountPaid().add(req.getAmount()));
        inv.setAmountOutstanding(inv.getTotalAmount().subtract(inv.getAmountPaid()));

        if (inv.getAmountOutstanding().compareTo(BigDecimal.ZERO) <= 0) {
            inv.setStatus(B2BInvoice.InvoiceStatus.PAID);
            inv.setAmountOutstanding(BigDecimal.ZERO);
        } else {
            inv.setStatus(B2BInvoice.InvoiceStatus.PARTIALLY_PAID);
        }

        invoiceRepository.save(inv);
        eventProducer.publishPaymentReceived(inv, payment);
        return toResponse(inv);
    }

    private InvoiceResponse toResponse(B2BInvoice inv) {
        InvoiceResponse r = new InvoiceResponse();
        r.setInvoiceId(inv.getInvoiceId());
        r.setTenantId(inv.getTenantId());
        r.setPartnerId(inv.getPartnerId());
        r.setInvoiceNumber(inv.getInvoiceNumber());
        r.setPeriodFrom(inv.getPeriodFrom());
        r.setPeriodTo(inv.getPeriodTo());
        r.setSubtotal(inv.getSubtotal());
        r.setTaxAmount(inv.getTaxAmount());
        r.setTotalAmount(inv.getTotalAmount());
        r.setAmountPaid(inv.getAmountPaid());
        r.setAmountOutstanding(inv.getAmountOutstanding());
        r.setStatus(inv.getStatus().name());
        r.setDueDate(inv.getDueDate());
        r.setSentAt(inv.getSentAt());
        return r;
    }
}
