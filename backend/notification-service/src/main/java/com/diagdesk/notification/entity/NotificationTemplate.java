package com.diagdesk.notification.entity;

import com.diagdesk.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "notification_templates", schema = "notifications")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
public class NotificationTemplate extends BaseEntity {

    public enum Channel { WHATSAPP, SMS, EMAIL }

    @Id
    @Column(name = "template_id", length = 36)
    private String templateId;

    @Column(name = "tenant_id", length = 36)
    private String tenantId;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false, length = 10)
    private Channel channel;

    @Column(name = "subject", length = 500)
    private String subject;

    @Column(name = "body", nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "variables", length = 500)
    private String variables;

    @Column(name = "dlt_template_id", length = 50)
    private String dltTemplateId;

    @Column(name = "language_code", length = 5)
    private String languageCode = "en";
}
