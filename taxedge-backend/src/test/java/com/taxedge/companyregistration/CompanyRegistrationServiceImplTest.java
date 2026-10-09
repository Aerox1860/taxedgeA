package com.taxedge.companyregistration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taxedge.companyregistration.dto.request.CapitalRequest;
import com.taxedge.companyregistration.dto.request.PersonRequest;
import com.taxedge.companyregistration.entity.CompanyCapital;
import com.taxedge.companyregistration.entity.CompanyDetails;
import com.taxedge.companyregistration.entity.CompanyPerson;
import com.taxedge.companyregistration.entity.CompanyRegistration;
import com.taxedge.companyregistration.mapper.CompanyRegistrationMapper;
import com.taxedge.companyregistration.repository.CompanyCapitalRepository;
import com.taxedge.companyregistration.repository.CompanyLinkedRegistrationRepository;
import com.taxedge.companyregistration.repository.CompanyPersonRepository;
import com.taxedge.companyregistration.repository.CompanyRegisteredOfficeRepository;
import com.taxedge.companyregistration.repository.CompanyRegistrationDocumentRepository;
import com.taxedge.companyregistration.repository.CompanyRegistrationPaymentRepository;
import com.taxedge.companyregistration.repository.CompanyRegistrationRepository;
import com.taxedge.companyregistration.repository.CompanyRegistrationTrackingRepository;
import com.taxedge.companyregistration.repository.CompanyShareholdingRepository;
import com.taxedge.companyregistration.repository.CompanyDetailsRepository;
import com.taxedge.companyregistration.service.CompanyRegistrationFileStorage;
import com.taxedge.companyregistration.service.CompanyRegistrationServiceImpl;
import com.taxedge.security.jwt.JwtPrincipal;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class CompanyRegistrationServiceImplTest {
    private final CompanyRegistrationRepository registrationRepository = mock(CompanyRegistrationRepository.class);
    private final CompanyDetailsRepository detailsRepository = mock(CompanyDetailsRepository.class);
    private final CompanyRegisteredOfficeRepository officeRepository = mock(CompanyRegisteredOfficeRepository.class);
    private final CompanyPersonRepository personRepository = mock(CompanyPersonRepository.class);
    private final CompanyCapitalRepository capitalRepository = mock(CompanyCapitalRepository.class);
    private final CompanyShareholdingRepository shareholdingRepository = mock(CompanyShareholdingRepository.class);
    private final CompanyRegistrationDocumentRepository documentRepository = mock(CompanyRegistrationDocumentRepository.class);
    private final CompanyLinkedRegistrationRepository linkedRepository = mock(CompanyLinkedRegistrationRepository.class);
    private final CompanyRegistrationPaymentRepository paymentRepository = mock(CompanyRegistrationPaymentRepository.class);
    private final CompanyRegistrationTrackingRepository trackingRepository = mock(CompanyRegistrationTrackingRepository.class);
    private final CompanyRegistrationFileStorage fileStorage = mock(CompanyRegistrationFileStorage.class);

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void updateCapitalKeepsCompanyDetailsResponseFieldsInSync() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(new JwtPrincipal("customer-1", null, null, null), null));

        CompanyRegistration registration = new CompanyRegistration();
        CompanyDetails details = new CompanyDetails();
        when(registrationRepository.findByIdAndUserId(1L, "customer-1")).thenReturn(Optional.of(registration));
        when(capitalRepository.findByRegistrationId(1L)).thenReturn(Optional.empty());
        when(capitalRepository.save(any())).thenAnswer(invocation -> {
            CompanyCapital capital = invocation.getArgument(0);
            capital.setId(1L);
            return capital;
        });
        when(detailsRepository.findByRegistrationId(1L)).thenReturn(Optional.of(details));
        when(detailsRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        CompanyRegistrationServiceImpl service = new CompanyRegistrationServiceImpl(
                registrationRepository, detailsRepository, officeRepository, personRepository, capitalRepository,
            shareholdingRepository, documentRepository, linkedRepository, paymentRepository, trackingRepository,
            new CompanyRegistrationMapper(), fileStorage);
        BigDecimal authorizedCapital = new BigDecimal("100000");
        BigDecimal paidUpCapital = new BigDecimal("75000");
        BigDecimal faceValuePerShare = new BigDecimal("100");

        service.updateCapital(1L, new CapitalRequest(authorizedCapital, paidUpCapital, 1000L, faceValuePerShare));

        assertThat(details.getAuthorizedCapital()).isEqualByComparingTo(authorizedCapital);
        assertThat(details.getPaidUpCapital()).isEqualByComparingTo(paidUpCapital);
        assertThat(details.getNumberOfShares()).isEqualTo(1000L);
        assertThat(details.getFaceValuePerShare()).isEqualByComparingTo(faceValuePerShare);
        verify(detailsRepository).save(details);
    }

    @Test
    void addPersonPersistsTheMappedNewEntity() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(new JwtPrincipal("customer-1", null, null, null), null));

        CompanyRegistration registration = new CompanyRegistration();
        registration.setId(3L);
        when(registrationRepository.findByIdAndUserId(3L, "customer-1")).thenReturn(Optional.of(registration));
        when(personRepository.findAllByRegistrationIdOrderByIdAsc(3L)).thenReturn(List.of());
        when(personRepository.save(any(CompanyPerson.class))).thenAnswer(invocation -> {
            CompanyPerson person = invocation.getArgument(0);
            person.setId(44L);
            return person;
        });

        CompanyRegistrationServiceImpl service = new CompanyRegistrationServiceImpl(
                registrationRepository, detailsRepository, officeRepository, personRepository, capitalRepository,
                shareholdingRepository, documentRepository, linkedRepository, paymentRepository, trackingRepository,
                new CompanyRegistrationMapper(), fileStorage);
        PersonRequest request = new ObjectMapper().readValue("""
                {"personType":"DIRECTOR","name":"Casey Doe","pan":"ABCDE1234F","email":"casey@example.com"}
                """, PersonRequest.class);

        var saved = service.addPerson(3L, request);

        assertThat(saved).containsEntry("id", 44L).containsEntry("name", "Casey Doe");
        verify(personRepository).save(any(CompanyPerson.class));
    }
}