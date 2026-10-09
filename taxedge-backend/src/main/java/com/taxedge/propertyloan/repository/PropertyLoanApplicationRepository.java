package com.taxedge.propertyloan.repository;

import com.taxedge.propertyloan.entity.PropertyLoanApplication;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PropertyLoanApplicationRepository extends JpaRepository<PropertyLoanApplication, Long> {
    Optional<PropertyLoanApplication> findByIdAndCustomer_CustId(Long id, String custId);
    List<PropertyLoanApplication> findAllByCustomer_CustIdOrderByCreatedAtDesc(String custId);
    boolean existsByApplicationNumber(String applicationNumber);
}
