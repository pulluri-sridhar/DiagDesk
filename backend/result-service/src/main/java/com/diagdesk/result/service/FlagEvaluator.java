package com.diagdesk.result.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class FlagEvaluator {

    private final CatalogClient catalogClient;

    public static class EvaluationResult {
        public final List<String> flags;
        public final String referenceRange;

        public EvaluationResult(List<String> flags, String referenceRange) {
            this.flags = flags;
            this.referenceRange = referenceRange;
        }

        public boolean hasCriticalFlag() {
            return flags.stream().anyMatch(f -> f.startsWith("CRITICAL"));
        }

        public String flagsAsString() {
            return flags.isEmpty() ? null : String.join(",", flags);
        }
    }

    public EvaluationResult evaluate(String testId, String rawValue, String tenantId) {
        List<String> flags = new ArrayList<>();
        String referenceRange = null;

        BigDecimal numericValue = tryParseNumeric(rawValue);
        if (numericValue == null) {
            // Non-numeric result (e.g. "Positive", "1+") — no flag evaluation
            return new EvaluationResult(flags, null);
        }

        CatalogClient.TestDetails details = catalogClient.getTestDetails(testId, tenantId);
        if (details == null || details.getReferenceRanges() == null || details.getReferenceRanges().isEmpty()) {
            return new EvaluationResult(flags, null);
        }

        // Use the gender=ALL reference range as the universal fallback for MVP
        // TODO: fetch patient demographics and select age/gender-specific range
        CatalogClient.ReferenceRange range = details.getReferenceRanges().stream()
                .filter(r -> "all".equalsIgnoreCase(r.getGender()))
                .findFirst()
                .orElse(details.getReferenceRanges().get(0));

        if (range.getLowerLimit() != null && range.getUpperLimit() != null) {
            referenceRange = range.getLowerLimit().toPlainString() + " - " + range.getUpperLimit().toPlainString();
        }

        if (range.getCriticalHigh() != null && numericValue.compareTo(range.getCriticalHigh()) > 0) {
            flags.add("CRITICAL_HIGH");
        } else if (range.getUpperLimit() != null && numericValue.compareTo(range.getUpperLimit()) > 0) {
            flags.add("H");
        }

        if (range.getCriticalLow() != null && numericValue.compareTo(range.getCriticalLow()) < 0) {
            if (!flags.contains("CRITICAL_HIGH")) { // mutually exclusive
                flags.add("CRITICAL_LOW");
            }
        } else if (range.getLowerLimit() != null && numericValue.compareTo(range.getLowerLimit()) < 0) {
            if (!flags.contains("H")) {
                flags.add("L");
            }
        }

        return new EvaluationResult(flags, referenceRange);
    }

    private BigDecimal tryParseNumeric(String value) {
        try {
            return new BigDecimal(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
