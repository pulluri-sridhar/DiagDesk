package com.diagdesk.patient.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Year;

/**
 * Generates unique, human-readable UHIDs per tenant per year.
 *
 * Format: LAB-{YEAR}-{NNNNN}  e.g. LAB-2026-00142
 *
 * Redis INCR provides atomic, distributed counter behaviour — safe when
 * multiple patient-service instances run concurrently (horizontal scaling).
 * The Redis key resets at year boundary automatically (new key, starts at 1).
 *
 * Fallback: if Redis is unavailable the service will throw, rejecting the
 * registration. This is correct — a UHID collision would be worse than a
 * momentary outage.
 */
@Component
@RequiredArgsConstructor
public class UhidGenerator {

    private final RedisTemplate<String, String> redisTemplate;

    public String next(String tenantId) {
        int year = Year.now().getValue();
        String key = "uhid:seq:" + tenantId + ":" + year;
        Long seq = redisTemplate.opsForValue().increment(key);
        if (seq == null) {
            throw new IllegalStateException("UHID sequence unavailable — Redis INCR returned null");
        }
        return String.format("LAB-%d-%05d", year, seq);
    }
}
