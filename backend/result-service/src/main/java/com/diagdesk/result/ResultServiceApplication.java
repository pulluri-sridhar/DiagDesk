package com.diagdesk.result;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
public class ResultServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ResultServiceApplication.class, args);
    }
}
