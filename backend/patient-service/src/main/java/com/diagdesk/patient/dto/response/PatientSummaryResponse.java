package com.diagdesk.patient.dto.response;

import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.time.LocalDate;

/** Compact patient projection returned by GET /v1/patients (search/list). */
@Value
@Builder
public class PatientSummaryResponse {
    String patientId;
    String uhid;
    String name;
    String phone;
    LocalDate dob;
    String gender;
    Instant createdAt;
}
