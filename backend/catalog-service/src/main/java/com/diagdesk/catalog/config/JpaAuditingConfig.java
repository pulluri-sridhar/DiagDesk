package com.diagdesk.catalog.config;

import com.diagdesk.common.security.TenantContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;

import java.util.Optional;

@Configuration
public class JpaAuditingConfig {

    @Bean
    public AuditorAware<String> auditorAware() {
        return () -> Optional.ofNullable(TenantContext.getUserId()).filter(s -> !s.isBlank());
    }
}
