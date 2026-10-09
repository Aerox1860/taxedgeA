package com.taxedge.propertyloan.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "property_loan_documents", indexes = {
    @Index(name = "idx_property_loan_document_application", columnList = "application_id"),
    @Index(name = "idx_property_loan_document_type", columnList = "document_type")
}, uniqueConstraints = @UniqueConstraint(
        name = "uk_property_loan_document_type", columnNames = {"application_id", "document_type"}))
@Getter
@Setter
@NoArgsConstructor
public class PropertyLoanDocument extends PropertyLoanAuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    private PropertyLoanApplication application;

    @Column(name = "document_type", nullable = false, length = 80)
    private String documentType;

    @Column(name = "document_name", nullable = false, length = 200)
    private String documentName;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    @Column(name = "file_size", nullable = false)
    private long fileSize;

    @Column(name = "content_type", nullable = false, length = 150)
    private String contentType;

    @Column(nullable = false)
    private boolean required;

    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt;
}
