package com.diagdesk.patient.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Response for GET /v1/patients/{id} — full patient profile. */
@Value
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PatientResponse {

    String patientId;
    String uhid;
    String firstName;
    String lastName;
    LocalDate dateOfBirth;
    String gender;
    String phone;
    String email;
    AddressDto address;
    String bloodGroup;
    List<String> allergies;
    String consentStatus;
    Instant createdAt;
    Instant updatedAt;

    @Value
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class AddressDto {
        String line1;
        String city;
        String state;
        String pincode;
    }
}
