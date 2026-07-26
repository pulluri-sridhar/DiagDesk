package com.diagdesk.patient.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/** Request body for POST /v1/patients and PUT /v1/patients/{id}. */
@Data
public class RegisterPatientRequest {

    @NotBlank(message = "First name is required")
    @Size(max = 100)
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(max = 100)
    private String lastName;

    @NotNull(message = "Date of birth is required")
    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    @NotBlank(message = "Gender is required")
    @Pattern(regexp = "male|female|other", message = "Gender must be male, female, or other")
    private String gender;

    @NotBlank(message = "Phone is required")
    @Pattern(regexp = "\\+91[6-9][0-9]{9}", message = "Phone must be a valid Indian mobile number: +91XXXXXXXXXX")
    private String phone;

    @Email(message = "Must be a valid email address")
    private String email;

    @Valid
    private AddressDto address;

    @Size(min = 4, max = 4, message = "Provide exactly the last 4 digits of Aadhaar")
    @Pattern(regexp = "[0-9]{4}", message = "Must be 4 numeric digits")
    private String aadhaarLast4;

    @Pattern(regexp = "A\\+|A-|B\\+|B-|O\\+|O-|AB\\+|AB-|unknown",
             message = "Blood group must be A+, A-, B+, B-, O+, O-, AB+, AB-, or unknown")
    private String bloodGroup;

    private List<@NotBlank String> allergies;

    private String referredByDoctorId;

    @Data
    public static class AddressDto {
        private String line1;
        private String city;
        private String state;
        @Pattern(regexp = "[1-9][0-9]{5}", message = "PIN code must be a valid 6-digit Indian postal code")
        private String pincode;
    }
}
