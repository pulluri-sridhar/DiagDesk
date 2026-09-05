package com.diagdesk.audit;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"com.diagdesk.audit", "com.diagdesk.common"})
public class AuditConsentServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AuditConsentServiceApplication.class, args);
    }
}
