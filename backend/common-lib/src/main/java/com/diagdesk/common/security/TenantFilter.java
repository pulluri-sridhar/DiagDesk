package com.diagdesk.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Runs after Spring Security's JWT filter.
 * Extracts tenant_id, branch_id, sub (user ID) from the validated Keycloak JWT
 * and populates TenantContext + MDC so all downstream code and log lines have
 * full context without being passed as parameters.
 *
 * X-Branch-Id header lets the caller scope a request to a specific branch.
 */
@Slf4j
public class TenantFilter extends OncePerRequestFilter {

    private static final String HEADER_BRANCH   = "X-Branch-Id";
    private static final String CLAIM_TENANT_ID = "tenant_id";
    private static final String MDC_TENANT      = "tenantId";
    private static final String MDC_USER        = "userId";
    private static final String MDC_TRACE       = "traceId";

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
                String tenantId = jwt.getClaimAsString(CLAIM_TENANT_ID);
                String userId   = jwt.getSubject();
                String email    = jwt.getClaimAsString("email");

                TenantContext.setTenantId(tenantId);
                TenantContext.setUserId(userId);
                TenantContext.setUserEmail(email);

                MDC.put(MDC_TENANT, tenantId);
                MDC.put(MDC_USER, userId);
            }

            String branchId = req.getHeader(HEADER_BRANCH);
            if (branchId != null && !branchId.isBlank()) {
                TenantContext.setBranchId(branchId);
            }

            chain.doFilter(req, res);
        } finally {
            TenantContext.clear();
            MDC.remove(MDC_TENANT);
            MDC.remove(MDC_USER);
            MDC.remove(MDC_TRACE);
        }
    }
}
