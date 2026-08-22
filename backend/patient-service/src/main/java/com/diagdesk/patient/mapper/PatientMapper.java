package com.diagdesk.patient.mapper;

import com.diagdesk.patient.dto.request.RegisterPatientRequest;
import com.diagdesk.patient.dto.response.PatientResponse;
import com.diagdesk.patient.dto.response.PatientSummaryResponse;
import com.diagdesk.patient.entity.Patient;
import org.mapstruct.*;

/**
 * MapStruct mapper — generated at compile time, zero reflection overhead.
 *
 * Mapping notes:
 *  - Address is flattened in the DB (addressLine1, addressCity, …) but nested in DTOs.
 *  - IDs, phonetic codes, and audit fields are excluded from toEntity() — the service sets them.
 *  - updateEntity() uses IGNORE for null source values so a partial PUT doesn't wipe fields.
 *  - allergies and consentStatus map directly via getter/setter (List<String> @JdbcTypeCode(JSON)).
 */
@Mapper(
    componentModel       = "spring",
    nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface PatientMapper {

    // ── Registration → Entity ─────────────────────────────────────────────────

    @Mapping(target = "patientId",         ignore = true)
    @Mapping(target = "uhid",              ignore = true)
    @Mapping(target = "tenantId",          ignore = true)
    @Mapping(target = "firstNameSoundex",  ignore = true)
    @Mapping(target = "lastNameSoundex",   ignore = true)
    @Mapping(target = "consentStatus",     ignore = true)
    @Mapping(target = "consentRecords",    ignore = true)
    @Mapping(target = "createdAt",         ignore = true)
    @Mapping(target = "updatedAt",         ignore = true)
    @Mapping(target = "createdBy",         ignore = true)
    @Mapping(target = "updatedBy",         ignore = true)
    @Mapping(target = "deletedAt",         ignore = true)
    @Mapping(source = "address.line1",     target = "addressLine1")
    @Mapping(source = "address.city",      target = "addressCity")
    @Mapping(source = "address.state",     target = "addressState")
    @Mapping(source = "address.pincode",   target = "addressPincode")
    @Mapping(source = "gender",            target = "gender")
    Patient toEntity(RegisterPatientRequest request);

    // ── Entity → Full Profile Response ────────────────────────────────────────

    @Mapping(target = "address",       expression = "java(mapAddress(patient))")
    @Mapping(target = "consentStatus", expression = "java(patient.getConsentStatus().name())")
    @Mapping(target = "gender",        expression = "java(patient.getGender().name())")
    PatientResponse toResponse(Patient patient);

    // ── Entity → List Summary ─────────────────────────────────────────────────

    @Mapping(target = "name",      expression = "java(patient.getFirstName() + \" \" + patient.getLastName())")
    @Mapping(target = "dob",       source = "dateOfBirth")
    @Mapping(target = "gender",    expression = "java(patient.getGender() != null ? patient.getGender().name() : null)")
    @Mapping(target = "createdAt", source = "createdAt")
    PatientSummaryResponse toSummary(Patient patient);

    // ── Partial Update (PUT) ──────────────────────────────────────────────────

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "patientId",         ignore = true)
    @Mapping(target = "uhid",              ignore = true)
    @Mapping(target = "tenantId",          ignore = true)
    @Mapping(target = "firstNameSoundex",  ignore = true)
    @Mapping(target = "lastNameSoundex",   ignore = true)
    @Mapping(target = "consentStatus",     ignore = true)
    @Mapping(target = "consentRecords",    ignore = true)
    @Mapping(target = "createdAt",         ignore = true)
    @Mapping(target = "updatedAt",         ignore = true)
    @Mapping(target = "createdBy",         ignore = true)
    @Mapping(target = "updatedBy",         ignore = true)
    @Mapping(target = "deletedAt",         ignore = true)
    @Mapping(source = "address.line1",     target = "addressLine1")
    @Mapping(source = "address.city",      target = "addressCity")
    @Mapping(source = "address.state",     target = "addressState")
    @Mapping(source = "address.pincode",   target = "addressPincode")
    void updateEntity(RegisterPatientRequest request, @MappingTarget Patient patient);

    // ── Helpers ───────────────────────────────────────────────────────────────

    default PatientResponse.AddressDto mapAddress(Patient p) {
        if (p.getAddressLine1() == null && p.getAddressCity() == null) return null;
        return PatientResponse.AddressDto.builder()
                .line1(p.getAddressLine1())
                .city(p.getAddressCity())
                .state(p.getAddressState())
                .pincode(p.getAddressPincode())
                .build();
    }
}
