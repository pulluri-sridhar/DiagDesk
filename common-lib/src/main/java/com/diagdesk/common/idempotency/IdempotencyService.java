package com.diagdesk.common.idempotency;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

/**
 * Redis-backed idempotency gate for all state-changing endpoints.
 *
 * Flow:
 *  1. Controller reads X-Idempotency-Key header and passes it to the service.
 *  2. Service calls check() — if present, returns the cached response body directly.
 *  3. After processing, service calls store() to persist the serialized response.
 *
 * TTL is 24 hours (enough for retries; safe to replay within a business day).
 * setIfAbsent ensures atomicity — concurrent identical requests resolve cleanly.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IdempotencyService {

    private static final Duration TTL        = Duration.ofHours(24);
    private static final String   KEY_PREFIX = "idem:";

    private final RedisTemplate<String, String> redisTemplate;

    /**
     * Returns the previously stored response body if this key was already processed.
     * Empty optional means the request is new and should be processed normally.
     */
    public Optional<String> check(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) return Optional.empty();
        try {
            String cached = redisTemplate.opsForValue().get(KEY_PREFIX + idempotencyKey);
            if (cached != null) {
                log.debug("Idempotency hit key={}", idempotencyKey);
            }
            return Optional.ofNullable(cached);
        } catch (Exception e) {
            log.warn("Idempotency check failed key={}: {}", idempotencyKey, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Stores the response body for a key (NX — only if absent).
     * Concurrent duplicate requests hitting this before processing completes
     * will both process; the second store is a no-op.
     */
    public void store(String idempotencyKey, String responseBody) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) return;
        try {
            redisTemplate.opsForValue().setIfAbsent(KEY_PREFIX + idempotencyKey, responseBody, TTL);
        } catch (Exception e) {
            log.warn("Idempotency store failed key={}: {}", idempotencyKey, e.getMessage());
        }
    }
}
