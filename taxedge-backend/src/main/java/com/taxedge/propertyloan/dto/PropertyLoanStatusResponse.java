package com.taxedge.propertyloan.dto;

import com.taxedge.propertyloan.entity.PropertyLoanStatus;

public record PropertyLoanStatusResponse(
        Long applicationId,
        String applicationNumber,
        PropertyLoanStatus status) {}
