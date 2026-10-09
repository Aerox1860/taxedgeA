package com.taxedge.propertyloan.service;

import org.springframework.http.HttpStatus;

public class PropertyLoanException extends RuntimeException {
    private final HttpStatus status;

    public PropertyLoanException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public PropertyLoanException(HttpStatus status, String message, Throwable cause) {
        super(message, cause);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
