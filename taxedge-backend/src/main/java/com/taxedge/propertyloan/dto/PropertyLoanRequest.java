package com.taxedge.propertyloan.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PropertyLoanRequest(
        String loanType,
        String loanTypeId,
        CustomerProfile customerProfile,
        LoanDetails loanDetails,
        ApplicantDetails applicantDetails,
        PropertyDetails propertyDetails,
        OwnershipDetails ownershipDetails,
        List<DocumentSelection> documents,
        Boolean isConsentChecked) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CustomerProfile(
            String name,
            String mobile,
            String email,
            String pan,
            String aadhaar,
            String dob,
            String address,
            String customerType) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LoanDetails(
            String loanType,
            String requiredAmount,
            String purpose,
            String customPurpose,
            String propertyStage,
            String estimatedPropertyValue,
            String propertyCity,
            String preferredTenureMonths,
            Boolean hasExistingLoans,
            String existingEmi,
            String monthlyIncomeOrTurnover,
            String employmentType) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
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
            String annualIncome,
            Boolean hasExistingLoans) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
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
            String area,
            String propertyAge,
            String approvingAuthority,
            String estimatedMarketValue) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record OwnershipDetails(
            String ownershipType,
            String coOwnerFullName,
            String coOwnerRelationship,
            String coOwnerPan,
            String coOwnerMobile,
            String currentLender,
            String existingLoanType,
            String outstandingLoanAmount,
            Boolean isConfirmationChecked) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DocumentSelection(
            String id,
            String name,
            String category,
            Boolean required,
            String fileName,
            Long fileSize) {}
}
