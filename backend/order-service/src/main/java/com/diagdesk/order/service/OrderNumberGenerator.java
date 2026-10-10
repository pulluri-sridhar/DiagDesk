package com.diagdesk.order.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Year;

/**
 * Generates sequential, human-readable order numbers.
 * Format: ORD-YYYY-NNNNN (e.g. ORD-2026-00142)
 * Uses a PostgreSQL sequence per calendar year — resets on year change via naming convention.
 */
@Component
public class OrderNumberGenerator {

    private final JdbcTemplate jdbc;

    public OrderNumberGenerator(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public String next() {
        int year = Year.now().getValue();
        String seq = "orders.order_seq_" + year;
        ensureSequenceExists(seq);
        Long next = jdbc.queryForObject("SELECT nextval('" + seq + "')", Long.class);
        return String.format("ORD-%d-%05d", year, next);
    }

    private void ensureSequenceExists(String seq) {
        jdbc.execute("CREATE SEQUENCE IF NOT EXISTS " + seq + " START 1 INCREMENT 1");
    }
}
