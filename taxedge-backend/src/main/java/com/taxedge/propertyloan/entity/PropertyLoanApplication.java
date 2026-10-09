package com.taxedge.propertyloan.entity;

import com.taxedge.customer.entity.Customer;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "property_loan_applications",
        uniqueConstraints = @UniqueConstraint(name = "uk_property_loan_application_number", columnNames = "application_number"),
        indexes = {
            @Index(name = "idx_property_loan_cust", columnList = "cust_id"),
            @Index(name = "idx_property_loan_status", columnList = "status"),
            @Index(name = "idx_property_loan_created", columnList = "created_at")
        })
@Getter
@Setter
@NoArgsConstructor
public class PropertyLoanApplication extends PropertyLoanAuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cust_id", referencedColumnName = "cust_id", nullable = false)
    private Customer customer;

    @Column(name = "application_number", nullable = false, unique = true, length = 40)
    private String applicationNumber;

    @Column(name = "loan_type", nullable = false, length = 80)
    private String loanType;

    @Column(name = "loan_type_id", nullable = false, length = 80)
    private String loanTypeId;

    @Column(length = 100)
    private String purpose;

    @Column(name = "custom_purpose", length = 255)
    private String customPurpose;

    @Column(name = "required_amount", precision = 19, scale = 2)
    private BigDecimal requiredAmount;

    @Column(name = "preferred_tenure_months")
    private Integer preferredTenureMonths;

    @Column(name = "employment_type", length = 100)
    private String employmentType;

    @Column(name = "is_existing_customer")
    private Boolean existingCustomer;

    @Column(name = "existing_emi", precision = 19, scale = 2)
    private BigDecimal existingEmi;

    @Column(name = "monthly_income_or_turnover", precision = 19, scale = 2)
    private BigDecimal monthlyIncomeOrTurnover;

    @Column(name = "property_stage", length = 60)
    private String propertyStage;

    @Column(name = "estimated_property_value", precision = 19, scale = 2)
    private BigDecimal estimatedPropertyValue;

    @Column(name = "property_city", length = 100)
    private String propertyCity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private PropertyLoanStatus status = PropertyLoanStatus.DRAFT;

    @Column(name = "is_confirmation_checked", nullable = false)
    private boolean confirmationChecked;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @OneToOne(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private PropertyLoanApplicant applicant;

    @OneToOne(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private PropertyLoanProperty property;

    @OneToOne(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private PropertyLoanOwnership ownership;

    @OneToMany(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PropertyLoanDocument> documents = new ArrayList<>();

    public void setApplicant(PropertyLoanApplicant applicant) {
        this.applicant = applicant;
        if (applicant != null) applicant.setApplication(this);
    }

    public void setProperty(PropertyLoanProperty property) {
        this.property = property;
        if (property != null) property.setApplication(this);
    }

    public void setOwnership(PropertyLoanOwnership ownership) {
        this.ownership = ownership;
        if (ownership != null) ownership.setApplication(this);
    }
}
