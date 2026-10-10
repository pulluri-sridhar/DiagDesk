package com.diagdesk.common.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

/**
 * Converts Supabase/PostgreSQL connection strings to JDBC format before
 * Spring Boot's DataSource auto-configuration runs.
 *
 * Accepts any of these formats set via SPRING_DATASOURCE_URL:
 *   postgresql://user:pass@host:5432/db
 *   postgres://user:pass@host:5432/db
 *   jdbc:postgresql://host:5432/db
 *
 * Extracts host/port/db from the URL and rebuilds a clean JDBC URL.
 * Credentials in the URL are moved to spring.datasource.username/password
 * only if those properties are not already set.
 */
public class DataSourceUrlNormalizer implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment env, SpringApplication app) {
        String raw = env.getProperty("spring.datasource.url");
        if (raw == null || raw.isBlank() || raw.startsWith("jdbc:")) return;

        try {
            // Normalise scheme so URI can parse it
            String uriStr = raw.startsWith("postgres://") ? raw.replaceFirst("postgres://", "postgresql://") : raw;
            URI uri = URI.create(uriStr);

            String host = uri.getHost();
            int    port = uri.getPort() > 0 ? uri.getPort() : 5432;
            String path = uri.getPath() != null ? uri.getPath() : "/postgres";
            String db   = path.startsWith("/") ? path.substring(1) : path;
            if (db.isBlank()) db = "postgres";

            // currentSchema will be set per-service via application-render.yml; keep query params if present
            String query = uri.getQuery();
            String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + db
                    + (query != null && !query.isBlank() ? "?" + query : "");

            Map<String, Object> props = new HashMap<>();
            props.put("spring.datasource.url", jdbcUrl);

            // If credentials are embedded in the URL and not already set separately, extract them
            String userInfo = uri.getUserInfo();
            if (userInfo != null && !userInfo.isBlank()) {
                String[] parts = userInfo.split(":", 2);
                if (env.getProperty("spring.datasource.username") == null) {
                    props.put("spring.datasource.username", parts[0]);
                }
                if (parts.length > 1 && env.getProperty("spring.datasource.password") == null) {
                    props.put("spring.datasource.password", parts[1]);
                }
            }

            env.getPropertySources().addFirst(new MapPropertySource("datasource-url-normalizer", props));

        } catch (Exception e) {
            // Leave URL as-is; Spring Boot will report a clear error on startup
        }
    }
}
