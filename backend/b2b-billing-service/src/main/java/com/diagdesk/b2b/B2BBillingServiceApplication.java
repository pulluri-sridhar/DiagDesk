package com.diagdesk.b2b;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"com.diagdesk.b2b", "com.diagdesk.common"})
public class B2BBillingServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(B2BBillingServiceApplication.class, args);
    }
}
