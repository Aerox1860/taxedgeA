package com.taxedge.propertyloan.dto;

import com.taxedge.propertyloan.entity.PropertyLoanStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record PropertyLoanResponse(
        String applicationId,
        String referenceNumber,
        String loanType,
        PropertyLoanStatus status,
        BigDecimal amount,
        LocalDateTime createdAt,
        List<TimelineEntry> timeline,
        PropertyLoanDetails loanDetails,
        ApplicantDetails applicantDetails,
        PropertyDetails propertyDetails,
        OwnershipDetails ownershipDetails,
        CustomerProfile customerProfile,
        List<PropertyLoanDocumentResponse> documents) {

    public record TimelineEntry(
            PropertyLoanStatus status,
            String title,
            String description,
            LocalDateTime timestamp,
            boolean completed,
            boolean isCurrent) {}

    public record PropertyLoanDetails(
            String loanType,
            String purpose,
            String customPurpose,
            BigDecimal requiredAmount,
            Integer preferredTenureMonths,
            String employmentType,
            Boolean isExistingCustomer,
            BigDecimal existingEmi,
            BigDecimal monthlyIncomeOrTurnover,
            String propertyStage,
            BigDecimal estimatedPropertyValue,
            String propertyCity) {}

    public record ApplicantDetails(
            String fullName,
            String pan,
            String mobile,
            String dob,
            String currentAddress,
            String gender,
            String maritalStatus,
            String residenceType,
            String yearsAtCurrentAddress,
            String employerCategory,
            String employerName,
            String totalWorkExperience,
            String yearsInCurrentJob,
            BigDecimal annualIncome,
            Boolean hasExistingLoans) {}

    public record PropertyDetails(
            String pincode,
            String city,
            String district,
            String state,
            String propertyAddress,
            String landmark,
            String propertyType,
            String propertySubType,
            String constructionStatus,
            String currentUsage,
            String areaType,
            BigDecimal area,
            String propertyAge,
            String approvingAuthority,
            BigDecimal estimatedMarketValue) {}

    public record OwnershipDetails(
            String ownershipType,
            String coOwnerFullName,
            String coOwnerRelationship,
            String coOwnerPan,
            String coOwnerMobile,
            String currentLender,
            String existingLoanType,
            BigDecimal outstandingLoanAmount,
            boolean isConfirmationChecked) {}

    public record CustomerProfile(
            String name,
            String mobile,
            String email,
            String pan,
            String aadhaar,
            String dob,
            String address,
            String customerType) {}
}
