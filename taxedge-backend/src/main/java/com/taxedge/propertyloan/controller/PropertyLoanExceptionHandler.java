package com.taxedge.propertyloan.controller;

import com.taxedge.propertyloan.service.PropertyLoanException;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice(basePackages = "com.taxedge.propertyloan")
public class PropertyLoanExceptionHandler {
    @ExceptionHandler(PropertyLoanException.class)
    public ResponseEntity<Map<String, Object>> propertyLoanFailure(PropertyLoanException exception) {
        if (exception.getStatus().is5xxServerError()) {
            log.error("Property Loan operation failed", exception);
        }
        return response(exception.getStatus(), exception.getMessage());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> conflict(DataIntegrityViolationException exception) {
        log.warn("Property Loan request violated a data constraint");
        return response(HttpStatus.CONFLICT, "Property Loan data conflicts with an existing record");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> invalidArgument(IllegalArgumentException exception) {
        return response(HttpStatus.BAD_REQUEST, exception.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> unexpected(Exception exception) {
        log.error("Unexpected Property Loan error", exception);
        return response(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected Property Loan error occurred");
    }

    private ResponseEntity<Map<String, Object>> response(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of(
                "status", status.value(),
                "message", message == null ? status.getReasonPhrase() : message));
    }
}
