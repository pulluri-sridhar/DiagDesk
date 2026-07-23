package com.diagdesk.patient.config;

import com.diagdesk.common.security.TenantFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Security configuration for the Patient Service.
 *
 * Auth model:
 *  - Kong Gateway validates the JWT before the request reaches this service
 *    (X-Consumer-Username / X-Authenticated-Userid headers populated).
 *  - Spring Security re-validates the JWT against Keycloak's JWKS endpoint
 *    as a defense-in-depth measure (in case a request bypasses Kong).
 *  - Authorities are extracted from the "realm_access.roles" Keycloak claim.
 *  - TenantFilter runs AFTER JWT auth — populates TenantContext from the JWT.
 *  - Method security (@PreAuthorize) enforces permission per endpoint.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health", "/actuator/info", "/actuator/prometheus").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter())))
                .addFilterAfter(new TenantFilter(), UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    /**
     * Maps Keycloak JWT realm_access.roles to Spring Security GrantedAuthority list.
     * Roles in Keycloak (e.g. "registration.create") become authorities usable in @PreAuthorize.
     */
    private JwtAuthenticationConverter jwtAuthConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Collection<String> roles = List.of();
            Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
            if (realmAccess != null && realmAccess.get("roles") instanceof List<?> roleList) {
                roles = roleList.stream().map(Object::toString).collect(Collectors.toList());
            }
            return roles.stream()
                    .map(SimpleGrantedAuthority::new)
                    .collect(Collectors.toList());
        });
        return converter;
    }
}
