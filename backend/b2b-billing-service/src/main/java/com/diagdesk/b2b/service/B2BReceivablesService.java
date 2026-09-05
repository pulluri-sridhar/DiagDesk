package com.diagdesk.b2b.service;

import com.diagdesk.b2b.dto.request.LogFollowUpRequest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public interface B2BReceivablesService {

    Map<String, Object> agingReport();

    Map<String, Object> accountStatement(String partnerId, LocalDate from, LocalDate to);

    Map<String, Object> logFollowUp(LogFollowUpRequest req);

    List<Map<String, Object>> listFollowUps(String partnerId);

    Map<String, Object> updateCreditLimit(String partnerId, BigDecimal newLimit);
}
