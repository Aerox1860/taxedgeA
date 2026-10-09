package com.taxedge.security.otp.controller;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.taxedge.customer.repository.CustomerRepository;
import com.taxedge.security.otp.entity.Otp;
import com.taxedge.security.otp.service.OtpService;


@RestController
@RequestMapping("/otp")
public class OtpController {
    private static final Logger log = LoggerFactory.getLogger(OtpController.class);

    private final OtpService otpService;

    private final CustomerRepository customerRepository;

    public OtpController(OtpService otpService, CustomerRepository customerRepository) {
        this.otpService = otpService;
        this.customerRepository = customerRepository;
    }

    @PostMapping("/generate")
    public ResponseEntity<String> generateOtp(@RequestBody Otp otp) {
        String mobileNumber = normalizeIndianMobile(otp.getMobileNumber());
        log.info("[OTP] request received for mobile {}", maskMobile(mobileNumber));
        if (mobileNumber == null) {
            return ResponseEntity.badRequest().body("Enter a valid Indian mobile number.");
        }
        otp.setMobileNumber(mobileNumber);
        log.info("[OTP] generating verification code for {}", maskMobile(mobileNumber));
        String result = otpService.generateOtp(otp);
        if ("OTP delivery provider is not configured.".equals(result)) {
            log.error("[OTP] SMS provider is not configured; no code sent for {}", maskMobile(mobileNumber));
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(result);
        }
        log.info("[OTP] development console delivery complete for {}", maskMobile(mobileNumber));
        return ResponseEntity.ok(result);
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyOtp(@RequestBody Otp otp) {
        String mobileNumber = normalizeIndianMobile(otp.getMobileNumber());
        log.info("[OTP] verification request received for {}", maskMobile(mobileNumber));
        if (mobileNumber == null || !StringUtils.hasText(otp.getOtpCode())) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "A valid mobile number and OTP are required."
            ));
        }
        otp.setMobileNumber(mobileNumber);
        if (!otpService.verifyOtp(otp)) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Invalid OTP"
            ));
        }
        log.info("[OTP] verified request for {}", maskMobile(mobileNumber));

        boolean isExisting = customerRepository.findByMobileNumber(otp.getMobileNumber()).isPresent();

        return ResponseEntity.ok(Map.of(
            "success", true,
            "isExistingUser", isExisting,
            "customerExists", isExisting,
            "hasPasscode", isExisting,
            "message", "OTP verified successfully"
        ));
    }

    private String normalizeIndianMobile(String mobileNumber) {
        if (!StringUtils.hasText(mobileNumber)) return null;
        String digits = mobileNumber.replaceAll("\\D", "");
        if (digits.length() == 12 && digits.startsWith("91")) digits = digits.substring(2);
        else if (digits.length() == 11 && digits.startsWith("0")) digits = digits.substring(1);
        return digits.matches("^[6-9][0-9]{9}$") ? digits : null;
    }

    private String maskMobile(String mobileNumber) {
        return mobileNumber == null ? "invalid" : "******" + mobileNumber.substring(6);
    }
}