package com.diagdesk.patient.repository;

import com.diagdesk.patient.entity.ConsentRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ConsentRepository extends JpaRepository<ConsentRecord, String> {

    @Query("""
            SELECT c FROM ConsentRecord c
            WHERE c.patient.patientId = :patientId
            ORDER BY c.capturedAt DESC
            """)
    List<ConsentRecord> findByPatientId(@Param("patientId") String patientId);

    @Query("""
            SELECT c FROM ConsentRecord c
            WHERE c.patient.patientId = :patientId
              AND c.consentType       = :consentType
              AND c.status            = 'active'
            ORDER BY c.capturedAt DESC
            """)
    List<ConsentRecord> findActiveByPatientIdAndType(
            @Param("patientId")   String patientId,
            @Param("consentType") String consentType);
}
