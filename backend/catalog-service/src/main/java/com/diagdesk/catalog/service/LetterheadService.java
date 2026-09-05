package com.diagdesk.catalog.service;

import com.diagdesk.catalog.dto.response.LetterheadResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface LetterheadService {
    LetterheadResponse create(MultipartFile logo, String headerHtml, String footerHtml,
                              Integer marginTopMm, Integer marginBottomMm, String branchId);
    List<LetterheadResponse> list();
    LetterheadResponse update(String letterheadId, MultipartFile logo, String headerHtml,
                              String footerHtml, Integer marginTopMm, Integer marginBottomMm);
}
