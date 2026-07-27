package com.diagdesk.catalog.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data @Builder
public class ImportFromNablResponse {
    private List<ImportedTest> imported;
    private List<String> alreadyExists;
    private List<String> notFound;

    @Data @Builder
    public static class ImportedTest {
        private String testId;
        private String nablCode;
        private String name;
    }
}
