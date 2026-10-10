package com.diagdesk.catalog.dto.response;

import com.diagdesk.catalog.entity.NablCatalogueEntry;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data @Builder
public class NablEntryResponse {
    private String nablCode;
    private String name;
    private String method;
    private String specimenType;
    private String category;
    private String unit;
    private List<NablCatalogueEntry.DefaultReferenceRange> defaultReferenceRanges;
}
