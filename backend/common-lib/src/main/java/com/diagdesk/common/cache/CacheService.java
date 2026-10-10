package com.diagdesk.common.cache;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;
import java.util.Set;

/**
 * Typed Redis cache wrapper with explicit TTL control.
 *
 * Rationale for explicit caching over @Cacheable:
 *  - Per-entity TTL tuning (patient profile vs. catalog vs. rate-card)
 *  - Pattern-based eviction (e.g. "patient:*" on branch update)
 *  - Never silently swallows serialization bugs — logs and continues
 *
 * All values are stored as JSON strings; ObjectMapper is injected so it
 * shares the same JavaTimeModule configuration project-wide.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CacheService {

    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    /** Store value as JSON with a TTL. Silently skips on serialization failure. */
    public <T> void put(String key, T value, Duration ttl) {
        try {
            String json = objectMapper.writeValueAsString(value);
            redisTemplate.opsForValue().set(key, json, ttl);
        } catch (Exception e) {
            log.warn("Cache write skipped key={} reason={}", key, e.getMessage());
        }
    }

    /** Read and deserialize by concrete class. Returns empty on miss or error. */
    public <T> Optional<T> get(String key, Class<T> type) {
        try {
            String json = redisTemplate.opsForValue().get(key);
            if (json == null) return Optional.empty();
            return Optional.of(objectMapper.readValue(json, type));
        } catch (Exception e) {
            log.warn("Cache read failed key={} reason={}", key, e.getMessage());
            return Optional.empty();
        }
    }

    /** Read and deserialize by TypeReference (e.g. List<Foo>). */
    public <T> Optional<T> get(String key, TypeReference<T> typeRef) {
        try {
            String json = redisTemplate.opsForValue().get(key);
            if (json == null) return Optional.empty();
            return Optional.of(objectMapper.readValue(json, typeRef));
        } catch (Exception e) {
            log.warn("Cache read failed key={} reason={}", key, e.getMessage());
            return Optional.empty();
        }
    }

    /** Remove a single key. */
    public void evict(String key) {
        try {
            redisTemplate.delete(key);
        } catch (Exception e) {
            log.warn("Cache evict failed key={} reason={}", key, e.getMessage());
        }
    }

    /**
     * Remove all keys matching a glob pattern.
     * Use sparingly — KEYS is O(N) on Redis. Prefer targeted eviction.
     */
    public void evictByPattern(String pattern) {
        try {
            Set<String> keys = redisTemplate.keys(pattern);
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
                log.debug("Cache evicted {} keys matching pattern={}", keys.size(), pattern);
            }
        } catch (Exception e) {
            log.warn("Cache pattern eviction failed pattern={} reason={}", pattern, e.getMessage());
        }
    }

    /** Check existence without loading the value. */
    public boolean exists(String key) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(key));
        } catch (Exception e) {
            return false;
        }
    }
}
