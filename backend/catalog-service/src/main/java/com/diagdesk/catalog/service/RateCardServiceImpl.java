package com.diagdesk.catalog.service;

import com.diagdesk.catalog.dto.request.CreateRateCardRequest;
import com.diagdesk.catalog.dto.request.ResolveRateRequest;
import com.diagdesk.catalog.dto.response.RateCardResponse;
import com.diagdesk.catalog.dto.response.RateCardSummaryResponse;
import com.diagdesk.catalog.dto.response.ResolvedRateResponse;
import com.diagdesk.catalog.entity.RateCard;
import com.diagdesk.catalog.entity.RateCardItem;
import com.diagdesk.catalog.repository.RateCardRepository;
import com.diagdesk.common.exception.DiagDeskException;
import com.diagdesk.common.exception.ErrorCode;
import com.diagdesk.common.security.TenantContext;
import com.diagdesk.common.util.UUIDv7;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RateCardServiceImpl implements RateCardService {

    private final RateCardRepository rateCardRepository;

    @Override
    @Transactional
    public RateCardResponse create(CreateRateCardRequest req) {
        String tenantId = requireTenant();

        RateCard card = new RateCard();
        card.setRateCardId(UUIDv7.generateAsString());
        card.setTenantId(tenantId);
        mapRequest(req, card);

        req.getItems().forEach(i -> {
            RateCardItem item = new RateCardItem();
            item.setItemId(UUIDv7.generateAsString());
            item.setRateCard(card);
            item.setTestId(i.getTestId());
            item.setPrice(i.getPrice() != null ? i.getPrice() : BigDecimal.ZERO);
            item.setGstRate(i.getGstRate() != null ? i.getGstRate() : BigDecimal.ZERO);
            item.setGstExempt(i.isGstExempt());
            card.getItems().add(item);
        });

        rateCardRepository.save(card);
        log.info("RateCard created rateCardId={} name={}", card.getRateCardId(), card.getName());
        return toResponse(card);
    }

    @Override
    public RateCardResponse getById(String rateCardId) {
        return toResponse(findCard(rateCardId));
    }

    @Override
    public List<RateCardSummaryResponse> list(String type, String branchId, String partnerId, LocalDate activeOn) {
        String tenantId = requireTenant();
        return rateCardRepository.findFiltered(tenantId, type, branchId, partnerId, activeOn)
                .stream().map(this::toSummary).toList();
    }

    @Override
    @Transactional
    public RateCardResponse update(String rateCardId, CreateRateCardRequest req) {
        RateCard card = findCard(rateCardId);
        mapRequest(req, card);
        card.getItems().clear();
        req.getItems().forEach(i -> {
            RateCardItem item = new RateCardItem();
            item.setItemId(UUIDv7.generateAsString());
            item.setRateCard(card);
            item.setTestId(i.getTestId());
            item.setPrice(i.getPrice() != null ? i.getPrice() : BigDecimal.ZERO);
            item.setGstRate(i.getGstRate() != null ? i.getGstRate() : BigDecimal.ZERO);
            item.setGstExempt(i.isGstExempt());
            card.getItems().add(item);
        });
        rateCardRepository.save(card);
        return toResponse(card);
    }

    @Override
    @Transactional
    public void delete(String rateCardId) {
        RateCard card = findCard(rateCardId);
        card.softDelete();
        rateCardRepository.save(card);
    }

    /**
     * Resolve price for a test given patient context.
     * Priority: b2b_partner → scheme → branch → not found.
     */
    @Override
    public ResolvedRateResponse resolve(ResolveRateRequest req) {
        String tenantId = requireTenant();
        LocalDate today = LocalDate.now();

        Optional<RateCard> card = Optional.empty();

        if ("b2b".equals(req.getPatientType()) && req.getB2bPartnerId() != null) {
            card = rateCardRepository.findActiveB2bCard(tenantId, req.getB2bPartnerId(), today);
        } else if (req.getSchemeCode() != null) {
            card = rateCardRepository.findActiveSchemeCard(tenantId, req.getSchemeCode(), today);
        }

        if (card.isEmpty()) {
            card = rateCardRepository.findActiveBranchCard(tenantId, req.getBranchId(), today);
        }

        if (card.isEmpty()) {
            throw new DiagDeskException(ErrorCode.NOT_FOUND, "No active rate card found for context");
        }

        RateCard resolved = card.get();
        RateCardItem item = resolved.getItems().stream()
                .filter(i -> i.getTestId().equals(req.getTestId()))
                .findFirst()
                .orElseThrow(() -> new DiagDeskException(ErrorCode.NOT_FOUND,
                        "testId=" + req.getTestId() + " not in rate card " + resolved.getRateCardId()));

        return ResolvedRateResponse.builder()
                .price(item.getPrice())
                .gstRate(item.getGstRate())
                .gstExempt(item.isGstExempt())
                .rateCardId(resolved.getRateCardId())
                .rateCardName(resolved.getName())
                .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private RateCard findCard(String rateCardId) {
        return rateCardRepository.findById(rateCardId)
                .orElseThrow(() -> new DiagDeskException(ErrorCode.NOT_FOUND, "rateCardId=" + rateCardId));
    }

    private String requireTenant() {
        String t = TenantContext.getTenantId();
        if (t == null || t.isBlank()) throw new DiagDeskException(ErrorCode.TENANT_REQUIRED);
        return t;
    }

    private void mapRequest(CreateRateCardRequest req, RateCard card) {
        card.setName(req.getName());
        card.setType(RateCard.RateCardType.valueOf(req.getType()));
        card.setBranchId(req.getBranchId());
        card.setPartnerId(req.getPartnerId());
        card.setSchemeCode(req.getSchemeCode());
        card.setEffectiveFrom(req.getEffectiveFrom());
        card.setEffectiveTo(req.getEffectiveTo());
    }

    private RateCardResponse toResponse(RateCard c) {
        return RateCardResponse.builder()
                .rateCardId(c.getRateCardId()).name(c.getName())
                .type(c.getType().name()).branchId(c.getBranchId())
                .partnerId(c.getPartnerId()).schemeCode(c.getSchemeCode())
                .effectiveFrom(c.getEffectiveFrom()).effectiveTo(c.getEffectiveTo())
                .items(c.getItems().stream().map(i -> RateCardResponse.Item.builder()
                        .itemId(i.getItemId()).testId(i.getTestId())
                        .price(i.getPrice()).gstRate(i.getGstRate()).gstExempt(i.isGstExempt())
                        .build()).toList())
                .createdAt(c.getCreatedAt()).updatedAt(c.getUpdatedAt())
                .build();
    }

    private RateCardSummaryResponse toSummary(RateCard c) {
        return RateCardSummaryResponse.builder()
                .rateCardId(c.getRateCardId()).name(c.getName())
                .type(c.getType().name()).branchId(c.getBranchId())
                .partnerId(c.getPartnerId()).schemeCode(c.getSchemeCode())
                .effectiveFrom(c.getEffectiveFrom()).effectiveTo(c.getEffectiveTo())
                .itemCount(c.getItems().size())
                .build();
    }
}
