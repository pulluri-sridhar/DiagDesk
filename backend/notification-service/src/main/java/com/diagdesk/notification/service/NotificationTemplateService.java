package com.diagdesk.notification.service;

import com.diagdesk.notification.dto.request.CreateTemplateRequest;
import com.diagdesk.notification.entity.NotificationTemplate;

import java.util.List;

public interface NotificationTemplateService {

    NotificationTemplate create(CreateTemplateRequest req);

    NotificationTemplate getById(String templateId);

    List<NotificationTemplate> list(String channel);

    NotificationTemplate update(String templateId, CreateTemplateRequest req);

    void delete(String templateId);
}
