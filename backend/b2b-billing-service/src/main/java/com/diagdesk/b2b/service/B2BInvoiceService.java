package com.diagdesk.b2b.service;

import com.diagdesk.b2b.dto.request.RecordPaymentRequest;
import com.diagdesk.b2b.dto.response.InvoiceResponse;

import java.util.List;

public interface B2BInvoiceService {

    List<InvoiceResponse> listInvoices(String partnerId, String status, int page, int size);

    InvoiceResponse getInvoice(String invoiceId);

    InvoiceResponse sendInvoice(String invoiceId, List<String> channels);

    InvoiceResponse recordPayment(String invoiceId, RecordPaymentRequest req);
}
