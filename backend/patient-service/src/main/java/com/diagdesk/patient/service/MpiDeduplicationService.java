package com.diagdesk.patient.service;

import com.diagdesk.patient.dto.request.DedupCheckRequest;
import com.diagdesk.patient.dto.response.RegisterPatientResponse.DedupMatch;
import com.diagdesk.patient.entity.Patient;
import com.diagdesk.patient.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.language.Soundex;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Master Patient Index (MPI) deduplication engine.
 *
 * Scoring model (weights sum to 1.0):
 *   Phone match       0.50  — strongest identifier in India (mobile-first)
 *   Phonetic name     0.30  — Soundex on first+last independently
 *   Date of birth     0.20  — exact match only
 *
 * Threshold: 0.70 — candidates above this are surfaced to the front-end
 * as "possible duplicates" requiring staff confirmation before registration.
 *
 * Soundex is used rather than Levenshtein because Indian names have high
 * transliteration variance (Suresh / Sureesh / Suresh Kumar) but consistent
 * phonetic encoding. Custom locale-tuning can be added in a later sprint.
 *
 * This service is read-only and stateless — safe to call from any thread.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MpiDeduplicationService {

    private static final double WEIGHT_PHONE = 0.50;
    private static final double WEIGHT_NAME  = 0.30;
    private static final double WEIGHT_DOB   = 0.20;
    static final double MATCH_THRESHOLD      = 0.70;

    private static final Soundex SOUNDEX = new Soundex();

    private final PatientRepository patientRepository;

    /**
     * Compute the Soundex phonetic code for a single name component.
     * Returns empty string for null/blank input — safe for downstream comparison.
     */
    public String soundexCode(String name) {
        if (name == null || name.isBlank()) return "";
        try {
            return SOUNDEX.soundex(name.trim());
        } catch (Exception e) {
            log.debug("Soundex encoding failed for name '{}': {}", name, e.getMessage());
            return "";
        }
    }

    /**
     * Find patients in the tenant that are likely duplicates of the candidate.
     * Returns matches sorted by descending match score.
     */
    public List<DedupMatch> findPotentialDuplicates(String tenantId, DedupCheckRequest req) {
        String firstSoundex = soundexCode(req.getFirstName());
        String lastSoundex  = soundexCode(req.getLastName());

        // Candidate set: phonetic name matches + exact phone match
        List<Patient> candidates = new ArrayList<>(
                patientRepository.findByPhoneticCodes(tenantId, firstSoundex, lastSoundex));

        if (req.getPhone() != null && !req.getPhone().isBlank()) {
            patientRepository.findByPhoneAndTenantId(req.getPhone(), tenantId)
                    .filter(p -> candidates.stream().noneMatch(c -> c.getPatientId().equals(p.getPatientId())))
                    .ifPresent(candidates::add);
        }

        List<DedupMatch> matches = new ArrayList<>();
        for (Patient candidate : candidates) {
            double score = computeScore(candidate, req, firstSoundex, lastSoundex);
            if (score >= MATCH_THRESHOLD) {
                matches.add(DedupMatch.builder()
                        .patientId(candidate.getPatientId())
                        .uhid(candidate.getUhid())
                        .name(candidate.getFirstName() + " " + candidate.getLastName())
                        .phone(maskPhone(candidate.getPhone()))
                        .matchScore(Math.round(score * 100.0) / 100.0)
                        .build());
            }
        }

        matches.sort(Comparator.comparingDouble(DedupMatch::getMatchScore).reversed());
        log.debug("MPI dedup: tenantId={} candidates={} matches={}", tenantId, candidates.size(), matches.size());
        return matches;
    }

    private double computeScore(Patient candidate, DedupCheckRequest req,
                                String reqFirstSoundex, String reqLastSoundex) {
        double score = 0.0;

        // Phone — exact match (including country code)
        if (req.getPhone() != null && req.getPhone().equals(candidate.getPhone())) {
            score += WEIGHT_PHONE;
        }

        // Phonetic name
        boolean firstMatch = !reqFirstSoundex.isEmpty()
                && reqFirstSoundex.equals(candidate.getFirstNameSoundex());
        boolean lastMatch  = !reqLastSoundex.isEmpty()
                && reqLastSoundex.equals(candidate.getLastNameSoundex());

        if (firstMatch && lastMatch) {
            score += WEIGHT_NAME;
        } else if (firstMatch || lastMatch) {
            score += WEIGHT_NAME * 0.5;
        }

        // Date of birth — exact calendar match
        if (req.getDateOfBirth() != null && req.getDateOfBirth().equals(candidate.getDateOfBirth())) {
            score += WEIGHT_DOB;
        }

        return Math.min(score, 1.0);
    }

    /** Mask all but the last 4 digits of a phone number before surfacing to the UI. */
    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 4) return "****";
        return "*".repeat(phone.length() - 4) + phone.substring(phone.length() - 4);
    }
}
