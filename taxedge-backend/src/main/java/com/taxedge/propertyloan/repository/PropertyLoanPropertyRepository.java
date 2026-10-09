package com.taxedge.propertyloan.repository;

import com.taxedge.propertyloan.entity.PropertyLoanProperty;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PropertyLoanPropertyRepository extends JpaRepository<PropertyLoanProperty, Long> {
    Optional<PropertyLoanProperty> findByApplication_Id(Long applicationId);
}
