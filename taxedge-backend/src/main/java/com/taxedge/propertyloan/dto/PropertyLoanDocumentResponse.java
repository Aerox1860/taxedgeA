package com.taxedge.propertyloan.dto;

import java.time.LocalDateTime;

public record PropertyLoanDocumentResponse(
        Long id,
        String documentType,
        String documentName,
        String fileName,
        long fileSize,
        String contentType,
        boolean required,
        LocalDateTime uploadedAt,
        String contentUrl) {}
