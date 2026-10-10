package com.diagdesk.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Local-dev only: reads tenant context from request headers instead of a JWT.
 * Also injects a superuser Authentication so @PreAuthorize expressions pass.
 * Never active in production — guarded by @Profile("local") on LocalSecurityConfig.
 *
 * Pass headers to curl/Postman:
 *   X-Tenant-Id: 00000000-0000-0000-0000-000000000001
 *   X-Branch-Id: 00000000-0000-0000-0000-000000000001
 *   X-User-Id:   local-dev-user
 *   X-User-Email: dev@local.diagdesk
 */
public class LocalDevTenantFilter extends OncePerRequestFilter {

    private static final String DEFAULT_TENANT = "00000000-0000-0000-0000-000000000001";
    private static final String DEFAULT_BRANCH  = "00000000-0000-0000-0000-000000000001";
    private static final String DEFAULT_USER    = "local-dev-user";
    private static final String DEFAULT_EMAIL   = "dev@local.diagdesk";

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        try {
            String tenantId = header(req, "X-Tenant-Id", DEFAULT_TENANT);
            String branchId = header(req, "X-Branch-Id",  DEFAULT_BRANCH);
            String userId   = header(req, "X-User-Id",    DEFAULT_USER);
            String email    = header(req, "X-User-Email", DEFAULT_EMAIL);

            TenantContext.setTenantId(tenantId);
            TenantContext.setBranchId(branchId);
            TenantContext.setUserId(userId);
            TenantContext.setUserEmail(email);

            MDC.put("tenantId", tenantId);
            MDC.put("userId", userId);

            // Grant all domain authorities so every @PreAuthorize check passes in local dev
            var auth = new UsernamePasswordAuthenticationToken(
                userId, null,
                List.of(
                    new SimpleGrantedAuthority("SUPER_ADMIN"),
                    new SimpleGrantedAuthority("report.signoff"),
                    new SimpleGrantedAuthority("report.deliver"),
                    new SimpleGrantedAuthority("report.print"),
                    new SimpleGrantedAuthority("finance.reports.master"),
                    new SimpleGrantedAuthority("finance.reports.money_collections"),
                    new SimpleGrantedAuthority("finance.reports.referral_activity"),
                    new SimpleGrantedAuthority("ROLE_SYSTEM")
                )
            );
            SecurityContextHolder.getContext().setAuthentication(auth);

            chain.doFilter(req, res);
        } finally {
            TenantContext.clear();
            SecurityContextHolder.clearContext();
            MDC.remove("tenantId");
            MDC.remove("userId");
        }
    }

    private static String header(HttpServletRequest req, String name, String fallback) {
        String value = req.getHeader(name);
        return (value != null && !value.isBlank()) ? value : fallback;
    }
}
