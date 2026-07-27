package com.diagdesk.order.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Year;

/**
 * Generates sequential accession numbers.
 * Format: ACC-YYYY-NNNNN (e.g. ACC-2026-00142)
 * Barcode: YYYY + 5-digit zero-padded sequence number (purely numeric for Code128).
 */
@Component
public class AccessionNumberGenerator {

    private final JdbcTemplate jdbc;

    public AccessionNumberGenerator(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public String nextAccessionNumber() {
        int year = Year.now().getValue();
        String seq = "orders.accession_seq_" + year;
        ensureSequenceExists(seq);
        Long next = jdbc.queryForObject("SELECT nextval('" + seq + "')", Long.class);
        return String.format("ACC-%d-%05d", year, next);
    }

    /** Barcode: YYYY + 5-digit zero-padded seq — e.g. 202600142 */
    public String toBarcode(String accessionNumber) {
        // accessionNumber = ACC-2026-00142 → extract last part
        String[] parts = accessionNumber.split("-");
        return parts[1] + String.format("%05d", Long.parseLong(parts[2]));
    }

    private void ensureSequenceExists(String seq) {
        jdbc.execute("CREATE SEQUENCE IF NOT EXISTS " + seq + " START 1 INCREMENT 1");
    }
}
