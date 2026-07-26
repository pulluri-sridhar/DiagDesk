package com.diagdesk.patient.config;

import com.diagdesk.common.audit.AuditEvent;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonSerializer;

import java.util.Map;

/**
 * Kafka producer configuration for audit events.
 *
 * Producer guarantees:
 *  - acks=all           → leader + all ISR must acknowledge
 *  - enable.idempotence → exactly-once delivery to broker
 *  - retries=5          → tolerates transient broker failures
 *
 * Separate ProducerFactory for AuditEvent avoids type-erasure issues
 * when multiple KafkaTemplate beans exist (e.g., domain event producers).
 */
@Configuration
public class KafkaConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Bean
    public ProducerFactory<String, AuditEvent> auditProducerFactory() {
        return new DefaultKafkaProducerFactory<>(Map.of(
                ProducerConfig.BOOTSTRAP_SERVERS_CONFIG,         bootstrapServers,
                ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,      StringSerializer.class,
                ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,    JsonSerializer.class,
                ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG,        true,
                ProducerConfig.ACKS_CONFIG,                      "all",
                ProducerConfig.RETRIES_CONFIG,                   5,
                ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 1
        ));
    }

    @Bean
    public KafkaTemplate<String, AuditEvent> kafkaTemplate() {
        return new KafkaTemplate<>(auditProducerFactory());
    }
}
