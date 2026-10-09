package com.taxedge.propertyloan.repository;

import com.taxedge.propertyloan.entity.PropertyLoanApplicant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PropertyLoanApplicantRepository extends JpaRepository<PropertyLoanApplicant, Long> {
    Optional<PropertyLoanApplicant> findByApplication_Id(Long applicationId);
}
