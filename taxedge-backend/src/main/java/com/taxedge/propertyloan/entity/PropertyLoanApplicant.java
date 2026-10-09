package com.taxedge.propertyloan.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "property_loan_applicants")
@Getter
@Setter
@NoArgsConstructor
public class PropertyLoanApplicant extends PropertyLoanAuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false, unique = true)
    private PropertyLoanApplication application;

    @Column(name = "full_name", length = 150)
    private String fullName;

    @Column(length = 10)
    private String pan;

    @Column(length = 10)
    private String mobile;

    private LocalDate dob;

    @Column(name = "current_address", length = 1000)
    private String currentAddress;

    @Column(length = 40)
    private String gender;

    @Column(name = "marital_status", length = 40)
    private String maritalStatus;

    @Column(name = "residence_type", length = 80)
    private String residenceType;

    @Column(name = "years_at_current_address", length = 40)
    private String yearsAtCurrentAddress;

    @Column(name = "employer_category", length = 80)
    private String employerCategory;

    @Column(name = "employer_name", length = 200)
    private String employerName;

    @Column(name = "total_work_experience", length = 40)
    private String totalWorkExperience;

    @Column(name = "years_in_current_job", length = 40)
    private String yearsInCurrentJob;

    @Column(name = "annual_income", precision = 19, scale = 2)
    private BigDecimal annualIncome;

    @Column(name = "has_existing_loans")
    private Boolean hasExistingLoans;
}
