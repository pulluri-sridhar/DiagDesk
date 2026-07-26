package com.diagdesk.common.util;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.UUID;

/**
 * Generates UUID version 7 — monotonically increasing, time-ordered UUIDs (RFC 9562).
 *
 * Layout (128 bits):
 *   [48 bits unix_ts_ms] [4 bits ver=0x7] [12 bits seq_rand] [2 bits var=0b10] [62 bits rand]
 *
 * These sort lexicographically by creation time, which is ideal for database primary keys
 * (avoids random B-tree splits) and edge-generated IDs that must be globally unique.
 */
public final class UUIDv7 {

    private static final SecureRandom RANDOM = new SecureRandom();

    private UUIDv7() {}

    public static UUID generate() {
        long tsMs = Instant.now().toEpochMilli();

        // Most-significant 64 bits: 48-bit timestamp | version 7 | 12-bit random
        long msb = (tsMs << 16)
                | 0x7000L                              // version bits (0111 0000 0000 0000)
                | (RANDOM.nextLong() & 0x0FFFL);       // 12 random bits

        // Least-significant 64 bits: 2-bit variant (10) | 62 random bits
        long lsb = (RANDOM.nextLong() & 0x3FFF_FFFF_FFFF_FFFFL)
                | 0x8000_0000_0000_0000L;              // variant bits (10xx)

        return new UUID(msb, lsb);
    }

    public static String generateAsString() {
        return generate().toString();
    }
}
