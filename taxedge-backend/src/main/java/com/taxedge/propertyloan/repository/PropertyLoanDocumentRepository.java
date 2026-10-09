package com.taxedge.propertyloan.repository;

import com.taxedge.propertyloan.entity.PropertyLoanDocument;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PropertyLoanDocumentRepository extends JpaRepository<PropertyLoanDocument, Long> {
    List<PropertyLoanDocument> findAllByApplication_IdOrderByUploadedAtDesc(Long applicationId);
    Optional<PropertyLoanDocument> findByIdAndApplication_Id(Long id, Long applicationId);
    boolean existsByApplication_IdAndDocumentType(Long applicationId, String documentType);
}
