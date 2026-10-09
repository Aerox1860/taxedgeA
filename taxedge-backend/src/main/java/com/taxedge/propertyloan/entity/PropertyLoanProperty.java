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
@Table(name = "property_loan_properties")
@Getter
@Setter
@NoArgsConstructor
public class PropertyLoanProperty extends PropertyLoanAuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false, unique = true)
    private PropertyLoanApplication application;

    @Column(length = 6)
    private String pincode;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String district;

    @Column(length = 100)
    private String state;

    @Column(name = "property_address", length = 1000)
    private String propertyAddress;

    @Column(length = 255)
    private String landmark;

    @Column(name = "property_type", length = 80)
    private String propertyType;

    @Column(name = "property_sub_type", length = 100)
    private String propertySubType;

    @Column(name = "construction_status", length = 80)
    private String constructionStatus;

    @Column(name = "current_usage", length = 80)
    private String currentUsage;

    @Column(name = "area_type", length = 80)
    private String areaType;

    @Column(precision = 19, scale = 2)
    private BigDecimal area;

    @Column(name = "property_age", length = 80)
    private String propertyAge;

    @Column(name = "approving_authority", length = 120)
    private String approvingAuthority;

    @Column(name = "estimated_market_value", precision = 19, scale = 2)
    private BigDecimal estimatedMarketValue;
}
