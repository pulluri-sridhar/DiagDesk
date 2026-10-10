package com.diagdesk.patient;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Service 1 — Patient (MPI) Service
 * Port 8081 | Base path /v1/patients
 *
 * Responsibilities:
 *  - Patient registration with MPI deduplication (Soundex + phone matching)
 *  - UHID generation (LAB-YYYY-NNNNN, Redis-sequenced per tenant)
 *  - DPDP consent capture and management
 *  - Patient search (name / phone / UHID / Aadhaar-last4)
 *
 * Component scan covers both this service and common-lib packages so that
 * shared beans (CacheService, AuditPublisher, GlobalExceptionHandler, etc.)
 * are picked up automatically.
 */
@SpringBootApplication(scanBasePackages = {
        "com.diagdesk.patient",
        "com.diagdesk.common"
})
@EnableAsync
@EnableKafka
public class PatientServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(PatientServiceApplication.class, args);
    }
}
