package com.diagdesk.patient.config;

import com.diagdesk.common.security.TenantContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

import java.util.Optional;

/**
 * Wires Spring Data JPA auditing to TenantContext so that
 * BaseEntity.createdBy / updatedBy are auto-populated with the
 * authenticated Keycloak user ID on every save.
 */
@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorProvider")
public class JpaAuditingConfig {

    @Bean
    public AuditorAware<String> auditorProvider() {
        return () -> Optional.ofNullable(TenantContext.getUserId())
                             .or(() -> Optional.of("system"));
    }
}
