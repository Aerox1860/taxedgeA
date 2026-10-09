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
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "property_loan_ownership")
@Getter
@Setter
@NoArgsConstructor
public class PropertyLoanOwnership extends PropertyLoanAuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false, unique = true)
    private PropertyLoanApplication application;

    @Column(name = "ownership_type", length = 50)
    private String ownershipType;

    @Column(name = "co_owner_full_name", length = 150)
    private String coOwnerFullName;

    @Column(name = "co_owner_relationship", length = 80)
    private String coOwnerRelationship;

    @Column(name = "co_owner_pan", length = 10)
    private String coOwnerPan;

    @Column(name = "co_owner_mobile", length = 10)
    private String coOwnerMobile;

    @Column(name = "current_lender", length = 120)
    private String currentLender;

    @Column(name = "existing_loan_type", length = 100)
    private String existingLoanType;

    @Column(name = "outstanding_loan_amount", precision = 19, scale = 2)
    private BigDecimal outstandingLoanAmount;

    @Column(name = "is_confirmation_checked", nullable = false)
    private boolean confirmationChecked;
}
