package com.diagdesk.notification.controller;

import com.diagdesk.notification.dto.request.CreateTemplateRequest;
import com.diagdesk.notification.entity.NotificationTemplate;
import com.diagdesk.notification.service.NotificationTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class NotificationTemplateController {

    private final NotificationTemplateService templateService;

    @PostMapping("/v1/notification-templates")
    @PreAuthorize("hasAnyAuthority('admin','ROLE_OWNER')")
    public ResponseEntity<NotificationTemplate> create(@Valid @RequestBody CreateTemplateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(templateService.create(req));
    }

    @GetMapping("/v1/notification-templates")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<NotificationTemplate>> list(
            @RequestParam(required = false) String channel) {
        return ResponseEntity.ok(templateService.list(channel));
    }

    @GetMapping("/v1/notification-templates/{templateId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<NotificationTemplate> getById(@PathVariable String templateId) {
        return ResponseEntity.ok(templateService.getById(templateId));
    }

    @PutMapping("/v1/notification-templates/{templateId}")
    @PreAuthorize("hasAnyAuthority('admin','ROLE_OWNER')")
    public ResponseEntity<NotificationTemplate> update(
            @PathVariable String templateId,
            @Valid @RequestBody CreateTemplateRequest req) {
        return ResponseEntity.ok(templateService.update(templateId, req));
    }

    @DeleteMapping("/v1/notification-templates/{templateId}")
    @PreAuthorize("hasAnyAuthority('admin','ROLE_OWNER')")
    public ResponseEntity<Void> delete(@PathVariable String templateId) {
        templateService.delete(templateId);
        return ResponseEntity.noContent().build();
    }
}
