package com.diagdesk.common.security;

/**
 * Thread-local holder for request-scoped tenant and user context.
 *
 * Populated by TenantFilter from the validated Keycloak JWT.
 * Consumed by repositories (tenant queries), AuditPublisher, and UhidGenerator.
 *
 * Always call clear() in a finally block (TenantFilter handles this for HTTP threads).
 * For async tasks, propagate via TaskDecorator or MDC copying.
 */
public final class TenantContext {

    private static final ThreadLocal<String> TENANT_ID  = new ThreadLocal<>();
    private static final ThreadLocal<String> BRANCH_ID  = new ThreadLocal<>();
    private static final ThreadLocal<String> USER_ID    = new ThreadLocal<>();
    private static final ThreadLocal<String> USER_EMAIL = new ThreadLocal<>();

    private TenantContext() {}

    public static void setTenantId(String v)  { TENANT_ID.set(v); }
    public static String getTenantId()         { return TENANT_ID.get(); }

    public static void setBranchId(String v)  { BRANCH_ID.set(v); }
    public static String getBranchId()         { return BRANCH_ID.get(); }

    public static void setUserId(String v)    { USER_ID.set(v); }
    public static String getUserId()           { return USER_ID.get(); }

    public static void setUserEmail(String v) { USER_EMAIL.set(v); }
    public static String getUserEmail()        { return USER_EMAIL.get(); }

    /** Must be called at the end of every request to prevent ThreadLocal leaks. */
    public static void clear() {
        TENANT_ID.remove();
        BRANCH_ID.remove();
        USER_ID.remove();
        USER_EMAIL.remove();
    }
}
