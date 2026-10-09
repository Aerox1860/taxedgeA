package com.taxedge.security.otp.service;

import java.security.SecureRandom;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.taxedge.security.otp.entity.Otp;
import com.taxedge.security.otp.repository.OtpRepository;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class OtpServiceImpl implements OtpService {

    private final OtpRepository otpRepository;
    private final SecureRandom secureRandom = new SecureRandom();
    private final boolean consoleDeliveryEnabled;

    public OtpServiceImpl(
            OtpRepository otpRepository,
            @Value("${app.otp.console-delivery-enabled:false}") boolean consoleDeliveryEnabled) {
        this.otpRepository = otpRepository;
        this.consoleDeliveryEnabled = consoleDeliveryEnabled;
    }

    @Override
    public String generateOtp(Otp otp) {
        if (!StringUtils.hasText(otp.getMobileNumber())) {
            throw new IllegalArgumentException("A valid mobile number is required.");
        }
        if (!consoleDeliveryEnabled) {
            log.error("[OTP] SMS provider request skipped; no SMS provider is configured.");
            return "OTP delivery provider is not configured.";
        }

        int code = 100000 + secureRandom.nextInt(900000);
        String otpCode = String.valueOf(code);
        Otp saved = otpRepository.findTopByMobileNumberOrderByIdDesc(otp.getMobileNumber());
        if (saved == null) {
            saved = Otp.builder()
                    .mobileNumber(otp.getMobileNumber())
                    .otpCode(otpCode)
                    .build();
        } else {
            saved.setOtpCode(otpCode);
        }
        otpRepository.saveAndFlush(saved);
        log.warn("[OTP] Development console delivery only for ******{}: {}",
                otp.getMobileNumber().substring(6), otpCode);
        return "Development OTP generated. Check the backend terminal.";
    }

    @Override
    public boolean verifyOtp(Otp otp) {
        if (otp.getMobileNumber() == null || otp.getOtpCode() == null) {
            return false;
        }

        Otp savedOtp = otpRepository.findTopByMobileNumberOrderByIdDesc(otp.getMobileNumber());

        if (savedOtp == null) {
            log.warn("[OTP] verification failed: no OTP record for ******{}",
                    otp.getMobileNumber().length() >= 10
                            ? otp.getMobileNumber().substring(otp.getMobileNumber().length() - 4)
                            : "unknown");
            return false;
        }

        boolean verified = otp.getOtpCode().equals(savedOtp.getOtpCode());
        if (verified) {
            log.info("[OTP] verification succeeded for ******{}",
                    otp.getMobileNumber().substring(6));
        } else {
            log.warn("[OTP] verification failed for ******{}",
                    otp.getMobileNumber().substring(6));
        }
        return verified;
    }
}