package com.diagdesk.order.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class HandoverRequest {
    private String handedOverTo;
    @NotBlank private String method;
    private String barcodeScanned;
    private String handedOverBy;
}
