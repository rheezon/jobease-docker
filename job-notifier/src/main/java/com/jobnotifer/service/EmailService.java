package com.jobnotifer.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {
    
    private final JavaMailSender mailSender;
    
    @Value("${spring.mail.username}")
    private String fromEmail;
    
    @Value("${app.frontend.url}")
    private String frontendUrl;

    /**
     * Public base URL of this API (scheme + host + port, no trailing path). Used for email
     * verification links so users hit the backend first, then get redirected to the SPA.
     */
    @Value("${app.api.public-url:http://localhost:8080}")
    private String apiPublicUrl;

    /** Base URL without trailing slash, for joining paths in email links. */
    private String frontendBaseUrl() {
        if (frontendUrl == null) {
            return "";
        }
        String base = frontendUrl.trim();
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base;
    }

    private String frontendPath(String pathWithLeadingSlash) {
        return frontendBaseUrl() + pathWithLeadingSlash;
    }

    private String apiPublicBaseUrl() {
        if (apiPublicUrl == null) {
            return "http://localhost:8080";
        }
        String base = apiPublicUrl.trim();
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base.isEmpty() ? "http://localhost:8080" : base;
    }
    
    /**
     * Send password reset email
     * @param toEmail Recipient email
     * @param token Reset token
     */
    public void sendEmailVerificationEmail(String toEmail, String token) {
        try {
            String encodedToken = URLEncoder.encode(token, StandardCharsets.UTF_8);
            String verifyLink = apiPublicBaseUrl() + "/api/auth/verify-email?token=" + encodedToken;

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Verify your email - JobKick");
            message.setText(buildEmailVerificationBody(verifyLink));

            mailSender.send(message);

            log.info("Email verification message sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send verification email to: {}", toEmail, e);
            throw new RuntimeException("Failed to send email. Please try again later.");
        }
    }

    public void sendPasswordResetEmail(String toEmail, String token) {
        try {
            String resetLink = frontendPath("/reset-password?token=" + token);
            
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Password Reset Request - JobKick");
            message.setText(buildPasswordResetEmailBody(resetLink));
            
            mailSender.send(message);
            
            log.info("Password reset email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}", toEmail, e);
            throw new RuntimeException("Failed to send email. Please try again later.");
        }
    }
    
    /**
     * Send generic email
     * @param toEmail Recipient email
     * @param subject Email subject
     * @param body Email body
     */
    public void sendEmail(String toEmail, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);
            
            mailSender.send(message);
            
            log.info("Email sent successfully to: {} with subject: {}", toEmail, subject);
        } catch (Exception e) {
            log.error("Failed to send email to: {} with subject: {}", toEmail, subject, e);
            // Don't throw exception - let caller handle gracefully
        }
    }
    
    /**
     * Build password reset email body
     */
    private String buildEmailVerificationBody(String verifyLink) {
        return "Hello,\n\n"
                + "Thanks for signing up for JobKick.\n\n"
                + "Please verify your email by opening this link (you will be sent to the sign-in page when it succeeds):\n"
                + verifyLink + "\n\n"
                + "This link expires in 24 hours.\n\n"
                + "If you did not create an account, you can ignore this email.\n\n"
                + "Best regards,\n"
                + "JobKick Team";
    }

    private String buildPasswordResetEmailBody(String resetLink) {
        return "Hello,\n\n" +
                "You have requested to reset your password for JobKick.\n\n" +
                "Please click the link below to reset your password:\n" +
                resetLink + "\n\n" +
                "This link will expire in 5 minutes.\n\n" +
                "If you did not request this password reset, please ignore this email.\n\n" +
                "Best regards,\n" +
                "JobKick Team";
    }
}

