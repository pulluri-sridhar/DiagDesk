package com.diagdesk.b2b.kafka;

import com.diagdesk.b2b.entity.B2BInvoice;
import com.diagdesk.b2b.entity.B2BPayment;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class B2BEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishInvoiceCreated(B2BInvoice invoice) {
        Map<String, Object> event = Map.of(
                "event_type", "InvoiceCreated",
                "invoice_id", invoice.getInvoiceId(),
                "partner_id", invoice.getPartnerId(),
                "tenant_id", invoice.getTenantId(),
                "total_amount", invoice.getTotalAmount(),
                "due_date", invoice.getDueDate() != null ? invoice.getDueDate().toString() : ""
        );
        kafkaTemplate.send("billing.invoice-created", invoice.getInvoiceId(), event);
        log.info("InvoiceCreated published: {}", invoice.getInvoiceId());
    }

    public void publishPaymentReceived(B2BInvoice invoice, B2BPayment payment) {
        Map<String, Object> event = Map.of(
                "event_type", "B2BPaymentReceived",
                "payment_id", payment.getPaymentId(),
                "invoice_id", payment.getInvoiceId(),
                "partner_id", invoice.getPartnerId(),
                "tenant_id", invoice.getTenantId(),
                "amount", payment.getAmount()
        );
        kafkaTemplate.send("billing.payment-received", payment.getPaymentId(), event);
        log.info("B2BPaymentReceived published: {}", payment.getPaymentId());
    }
}
