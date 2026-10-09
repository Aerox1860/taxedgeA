package com.taxedge.customer.controller;

import com.taxedge.customer.dto.CustomerDto;
import com.taxedge.customer.dto.LoginRequest;
import com.taxedge.customer.service.CustomerService;
import com.taxedge.security.jwt.CustomerJwt;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/customer")
public class CustomerController {
    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @PostMapping("/register")
    public ResponseEntity<CustomerJwt> registerCustomer(@RequestBody CustomerDto customerDto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(customerService.registerCustomer(customerDto));
    }

    @PostMapping("/login")
    public ResponseEntity<CustomerJwt> loginCustomer(@RequestBody LoginRequest loginRequest) {
        return ResponseEntity.ok(customerService.loginCustomer(loginRequest));
    }

    @GetMapping("/exists/{mobileNumber}")
    public ResponseEntity<Map<String, Object>> checkUserExists(@PathVariable String mobileNumber) {
        boolean exists = customerService.existsByMobileNumber(mobileNumber);
        return ResponseEntity.ok(Map.of("exists", exists, "mobileNumber", mobileNumber));
    }

    @PutMapping("/update")
    public ResponseEntity<String> updateCustomer(@Valid @RequestBody CustomerDto customerDto) {
        return ResponseEntity.ok(customerService.updateCustomer(customerDto));
    }

    @GetMapping("/details/{custId}")
    public ResponseEntity<CustomerDto> getDetails(@PathVariable String custId) {
        return ResponseEntity.ok(customerService.getDetails(custId));
    }
}