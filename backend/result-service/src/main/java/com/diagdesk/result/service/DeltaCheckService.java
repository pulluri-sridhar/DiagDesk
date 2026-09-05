package com.diagdesk.result.service;

import com.diagdesk.result.dto.response.DeltaCheckResponse;
import com.diagdesk.result.entity.TestResult;
import com.diagdesk.result.repository.TestResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.ZoneOffset;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DeltaCheckService {

    private static final BigDecimal DELTA_ALERT_THRESHOLD_PCT = new BigDecimal("25");

    private final TestResultRepository resultRepository;

    public DeltaCheckResponse check(TestResult current) {
        List<TestResult> previous = resultRepository.findPreviousResults(
                current.getTenantId(),
                current.getPatientId(),
                current.getTestId(),
                current.getResultId(),
                PageRequest.of(0, 1)
        );

        if (previous.isEmpty()) {
            return DeltaCheckResponse.builder()
                    .deltaPct(null)
                    .previousValue(null)
                    .previousDate(null)
                    .deltaFlag(false)
                    .alertMessage("No previous result found for this patient and test")
                    .build();
        }

        TestResult prev = previous.get(0);
        BigDecimal currentVal = tryParseNumeric(current.getValue());
        BigDecimal prevVal    = tryParseNumeric(prev.getValue());

        if (currentVal == null || prevVal == null || prevVal.compareTo(BigDecimal.ZERO) == 0) {
            return DeltaCheckResponse.builder()
                    .deltaPct(null)
                    .previousValue(prev.getValue())
                    .previousDate(prev.getCreatedAt().atOffset(ZoneOffset.UTC).toLocalDate().toString())
                    .deltaFlag(false)
                    .alertMessage("Non-numeric values — delta check not applicable")
                    .build();
        }

        BigDecimal changePct = currentVal.subtract(prevVal)
                .divide(prevVal, 4, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"))
                .abs();

        boolean exceeded = changePct.compareTo(DELTA_ALERT_THRESHOLD_PCT) > 0;
        String direction = currentVal.compareTo(prevVal) > 0 ? "increased" : "decreased";
        String message = exceeded
                ? "Value " + direction + " " + changePct.setScale(1, RoundingMode.HALF_UP) + "% vs last result"
                : null;

        return DeltaCheckResponse.builder()
                .deltaPct(changePct.setScale(1, RoundingMode.HALF_UP))
                .previousValue(prev.getValue())
                .previousDate(prev.getCreatedAt().atOffset(ZoneOffset.UTC).toLocalDate().toString())
                .deltaFlag(exceeded)
                .alertMessage(message)
                .build();
    }

    private BigDecimal tryParseNumeric(String value) {
        try {
            return new BigDecimal(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
