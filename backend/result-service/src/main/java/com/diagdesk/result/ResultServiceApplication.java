package com.diagdesk.result;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication(scanBasePackages = {
        "com.diagdesk.result",
        "com.diagdesk.common"
})
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
@EnableAsync
@EnableKafka
public class ResultServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ResultServiceApplication.class, args);
    }
}
