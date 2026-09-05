package com.diagdesk.notification.service;

import com.diagdesk.common.exception.DiagDeskException;
import com.diagdesk.common.exception.ErrorCode;
import com.diagdesk.common.security.TenantContext;
import com.diagdesk.common.util.UUIDv7;
import com.diagdesk.notification.dto.request.CreateTemplateRequest;
import com.diagdesk.notification.entity.NotificationTemplate;
import com.diagdesk.notification.repository.NotificationTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationTemplateServiceImpl implements NotificationTemplateService {

    private final NotificationTemplateRepository templateRepository;

    @Override
    @Transactional
    public NotificationTemplate create(CreateTemplateRequest req) {
        NotificationTemplate t = new NotificationTemplate();
        t.setTemplateId(UUIDv7.generateAsString());
        t.setTenantId(TenantContext.getTenantId());
        t.setName(req.getName());
        t.setChannel(NotificationTemplate.Channel.valueOf(req.getChannel().toUpperCase()));
        t.setSubject(req.getSubject());
        t.setBody(req.getBody());
        t.setVariables(req.getVariables());
        t.setDltTemplateId(req.getDltTemplateId());
        t.setLanguageCode(req.getLanguageCode() != null ? req.getLanguageCode() : "en");
        return templateRepository.save(t);
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationTemplate getById(String templateId) {
        return templateRepository.findById(templateId)
                .orElseThrow(() -> new DiagDeskException(ErrorCode.RESOURCE_NOT_FOUND, "Template not found: " + templateId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationTemplate> list(String channel) {
        if (channel != null) {
            return templateRepository.findByChannel(
                    NotificationTemplate.Channel.valueOf(channel.toUpperCase()));
        }
        return templateRepository.findByTenantId(TenantContext.getTenantId());
    }

    @Override
    @Transactional
    public NotificationTemplate update(String templateId, CreateTemplateRequest req) {
        NotificationTemplate t = getById(templateId);
        t.setName(req.getName());
        t.setChannel(NotificationTemplate.Channel.valueOf(req.getChannel().toUpperCase()));
        t.setSubject(req.getSubject());
        t.setBody(req.getBody());
        t.setVariables(req.getVariables());
        t.setDltTemplateId(req.getDltTemplateId());
        if (req.getLanguageCode() != null) t.setLanguageCode(req.getLanguageCode());
        return templateRepository.save(t);
    }

    @Override
    @Transactional
    public void delete(String templateId) {
        NotificationTemplate t = getById(templateId);
        templateRepository.delete(t);
    }
}
