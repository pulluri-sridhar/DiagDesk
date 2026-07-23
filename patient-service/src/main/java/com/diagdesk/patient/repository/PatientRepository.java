package com.diagdesk.patient.repository;

import com.diagdesk.patient.entity.Patient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PatientRepository extends JpaRepository<Patient, String> {

    Optional<Patient> findByUhid(String uhid);

    Optional<Patient> findByPhoneAndTenantId(String phone, String tenantId);

    /**
     * Full-text search across name, phone, UHID, and Aadhaar-last4.
     * ILIKE is used for case-insensitive matching on name fields.
     * Indexed columns (phone, uhid) fall back to equality after LIKE prefix.
     */
    @Query("""
            SELECT p FROM Patient p
            WHERE p.tenantId = :tenantId
              AND (
                   LOWER(CONCAT(p.firstName, ' ', p.lastName)) LIKE LOWER(CONCAT('%', :q, '%'))
                OR p.phone        LIKE CONCAT('%', :q, '%')
                OR p.uhid         LIKE CONCAT('%', :q, '%')
                OR p.aadhaarLast4 = :q
              )
            ORDER BY p.createdAt DESC
            """)
    Page<Patient> search(
            @Param("tenantId") String tenantId,
            @Param("q") String q,
            Pageable pageable);

    /** Ordered list for a tenant (no search filter). */
    @Query("SELECT p FROM Patient p WHERE p.tenantId = :tenantId ORDER BY p.createdAt DESC")
    Page<Patient> findAllByTenantId(@Param("tenantId") String tenantId, Pageable pageable);

    /**
     * MPI dedup lookup by phonetic codes.
     * Called before registration to surface potential duplicates.
     * Returns multiple rows when first+last Soundex codes collide (common for
     * Indian names — Singh / Sing, Sharma / Sarma).
     */
    @Query("""
            SELECT p FROM Patient p
            WHERE p.tenantId         = :tenantId
              AND p.firstNameSoundex = :firstSoundex
              AND p.lastNameSoundex  = :lastSoundex
            """)
    List<Patient> findByPhoneticCodes(
            @Param("tenantId")     String tenantId,
            @Param("firstSoundex") String firstSoundex,
            @Param("lastSoundex")  String lastSoundex);
}
