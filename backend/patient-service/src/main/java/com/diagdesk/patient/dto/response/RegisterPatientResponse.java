package com.diagdesk.patient.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.List;

/** Response for POST /v1/patients (201 Created). */
@Value
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RegisterPatientResponse {

    String patientId;
    String uhid;

    /** 0.0–1.0. Values >0.7 mean a likely duplicate was found. */
    double mpiMatchScore;

    /** Populated only when mpiMatchScore > 0.0. Front-end shows a "possible duplicate" warning. */
    List<DedupMatch> potentialDuplicates;

    Instant createdAt;

    @Value
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class DedupMatch {
        String patientId;
        String uhid;
        String name;
        String phone;   // masked — last 4 digits replaced with XXXX
        double matchScore;
    }
}
