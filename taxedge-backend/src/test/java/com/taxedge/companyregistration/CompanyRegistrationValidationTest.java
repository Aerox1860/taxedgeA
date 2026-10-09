package com.taxedge.companyregistration;

import static org.assertj.core.api.Assertions.assertThat;

import com.taxedge.companyregistration.controller.CompanyRegistrationController;
import com.taxedge.companyregistration.dto.CompanyRegistrationDto;
import com.taxedge.companyregistration.dto.request.CapitalRequest;
import com.taxedge.companyregistration.dto.request.CompanyDetailsRequest;
import com.taxedge.companyregistration.dto.request.CreateCompanyRegistrationRequest;
import com.taxedge.companyregistration.dto.request.UpdateCompanyRegistrationRequest;
import com.taxedge.companyregistration.exception.CompanyRegistrationExceptionHandler;
import jakarta.validation.Valid;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.validation.ObjectError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.RequestBody;

class CompanyRegistrationValidationTest {
    private static ValidatorFactory validatorFactory;
    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    @AfterAll
    static void closeValidatorFactory() {
        validatorFactory.close();
    }

    @Test
    void permitsMinimalCreateAndPartialUpdate() {
        CreateCompanyRegistrationRequest create = new CreateCompanyRegistrationRequest(
                "Private Limited", null, null, null, null, null, null, null, null, null);
        UpdateCompanyRegistrationRequest update = new UpdateCompanyRegistrationRequest(
                "", null, 0, null, null, null, null, null, null);

        assertThat(validator.validate(create)).isEmpty();
        assertThat(validator.validate(update)).isEmpty();
    }

    @Test
    void cascadesValidationIntoOptionalNestedSections() {
        CompanyDetailsRequest invalidDetails = new CompanyDetailsRequest(
                null, null, null, null, null,
                "Software services", "6201", null,
                "First Name Private Limited", "Second Name Private Limited", null,
                null, null, "contact@example.com", "9876543210");
        CreateCompanyRegistrationRequest create = new CreateCompanyRegistrationRequest(
                "Private Limited", null, null, null, invalidDetails, null, null, null, null, null);

        assertThat(validator.validate(create))
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("companyDetails.nicCode");

        UpdateCompanyRegistrationRequest partialUpdate = new UpdateCompanyRegistrationRequest(
                null, null, null, null, null, null,
                new CapitalRequest(BigDecimal.ZERO, BigDecimal.ONE, null, null), null, null);
        assertThat(validator.validate(partialUpdate))
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("capital.authorizedCapital");
    }

    @Test
    void validatesNestedFieldsInDraftPayload() {
        CompanyRegistrationDto.DraftCompanyRequest company = new CompanyRegistrationDto.DraftCompanyRequest(
                "Private Limited", null, null, null, null, null,
                "Software services", "62011", null,
                "First Name Private Limited", "Second Name Private Limited", null,
                null, null,
                "Plot 42", "Hyderabad", null, "Telangana", "500081", null,
                "contact@example.com", "1234567890",
                null, null, null, null, null, null,
                BigDecimal.ONE, BigDecimal.ONE, 1L, BigDecimal.ONE);
        CompanyRegistrationDto.DraftRequest request = new CompanyRegistrationDto.DraftRequest(
                null, company, List.of(), null, List.of(), List.of(), null, null, List.of(), null,
                null, null, null, null, null);

        assertThat(validator.validate(request))
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("company.companyMobile");
    }

    @Test
    void validatesEveryControllerRequestBody() {
        Set<String> unvalidatedBodyParameters = java.util.Arrays.stream(CompanyRegistrationController.class.getDeclaredMethods())
                .flatMap(method -> java.util.Arrays.stream(method.getParameters()))
                .filter(parameter -> parameter.isAnnotationPresent(RequestBody.class))
                .filter(parameter -> !parameter.isAnnotationPresent(Valid.class))
                .map(parameter -> parameter.getName())
                .collect(Collectors.toSet());

        assertThat(unvalidatedBodyParameters).isEmpty();
    }

        @Test
        void returnsBadRequestForBeanValidationFailures() {
                BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(new Object(), "request");
                bindingResult.addError(new FieldError("request", "companyDetails.nicCode", "6201", false,
                                null, null, "must match \"[0-9]{5}\""));
                MethodArgumentNotValidException exception = new MethodArgumentNotValidException(null, bindingResult);

                var response = new CompanyRegistrationExceptionHandler().invalidRequest(exception);

                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(response.getBody()).containsEntry("message", "Request validation failed");
                assertThat(response.getBody().get("errors").toString()).contains("companyDetails.nicCode");
        }
}