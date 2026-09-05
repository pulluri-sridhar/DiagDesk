package com.diagdesk.patient.dto.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

/** Response for POST /v1/patients/dedup-check. */
@Value
@Builder
public class DedupCheckResponse {
    List<PotentialMatch> potentialMatches;

    @Value
    @Builder
    public static class PotentialMatch {
        String patientId;
        String uhid;
        String name;
        String phone;
        double matchScore;
    }
}
