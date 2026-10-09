package com.taxedge.propertyloan.repository;

import com.taxedge.propertyloan.entity.PropertyLoanOwnership;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PropertyLoanOwnershipRepository extends JpaRepository<PropertyLoanOwnership, Long> {
    Optional<PropertyLoanOwnership> findByApplication_Id(Long applicationId);
}
