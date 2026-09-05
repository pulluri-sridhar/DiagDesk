package com.diagdesk.patient.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.time.LocalDate;

/** Request body for POST /v1/patients/dedup-check (non-persisting MPI lookup). */
@Data
public class DedupCheckRequest {

    @NotBlank(message = "First name is required for dedup check")
    private String firstName;

    @NotBlank(message = "Last name is required for dedup check")
    private String lastName;

    @NotNull(message = "Date of birth is required for dedup check")
    @Past
    private LocalDate dateOfBirth;

    @Pattern(regexp = "\\+91[6-9][0-9]{9}", message = "Phone must be +91XXXXXXXXXX")
    private String phone;
}
