package com.jobnotifer.service;

import com.jobnotifer.dto.ApiResponse;
import com.jobnotifer.dto.AuthResponse;
import com.jobnotifer.dto.LoginRequest;
import com.jobnotifer.dto.SignupRequest;
import com.jobnotifer.dto.SignupResponse;
import com.jobnotifer.entity.EmailVerificationToken;
import com.jobnotifer.entity.PasswordResetToken;
import com.jobnotifer.entity.User;
import com.jobnotifer.exception.UserNotFoundException;
import com.jobnotifer.repository.EmailVerificationTokenRepository;
import com.jobnotifer.repository.PasswordResetTokenRepository;
import com.jobnotifer.repository.UserRepository;
import com.jobnotifer.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import org.springframework.beans.factory.annotation.Value;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Collections;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final EmailService emailService;
    private final ForgotPasswordRateLimiter forgotPasswordRateLimiter;
    
    @Value("${GOOGLE_CLIENT_ID:}")
    private String googleClientId;
    
    private static String normalizeEmail(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.trim().toLowerCase(Locale.ROOT);
    }

    @Transactional
    public SignupResponse registerUser(SignupRequest signupRequest) {
        String email = normalizeEmail(signupRequest.getEmail());
        Optional<User> existingOpt = userRepository.findByEmailIgnoreCase(email);

        if (existingOpt.isPresent()) {
            User existing = existingOpt.get();
            if (isEmailVerified(existing)) {
                throw new RuntimeException("Email already exists!");
            }
            // Same email, not verified yet: allow completing signup again if password matches
            if (!passwordEncoder.matches(signupRequest.getPassword(), existing.getPassword())) {
                throw new RuntimeException(
                        "This email is already registered but not verified. Use the same password you chose when "
                                + "you registered, or log in and use “Resend verification email”, or use Forgot password."
                );
            }
            existing.setEmail(email);
            existing.setFullName(signupRequest.getFullName());
            userRepository.save(existing);
            sendEmailVerificationForUser(existing);
            log.info("Resent verification for pending registration: {}", existing.getEmail());
            return new SignupResponse(
                    true,
                    "We sent another verification link to your email. Please verify your address before signing in."
            );
        }

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(signupRequest.getPassword()));
        user.setFullName(signupRequest.getFullName());
        user.setEmailVerified(false);

        User savedUser = userRepository.save(user);
        sendEmailVerificationForUser(savedUser);

        log.info("User registered (pending email verification): {}", savedUser.getEmail());

        return new SignupResponse(
                true,
                "We sent a verification link to your email. Please verify your address before signing in."
        );
    }
    
    public AuthResponse authenticateUser(LoginRequest loginRequest) {
        String email = normalizeEmail(loginRequest.getEmail());
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        email,
                        loginRequest.getPassword()
                )
        );

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!isEmailVerified(user)) {
            throw new RuntimeException(
                    "Please verify your email before logging in. Check your inbox for the verification link."
            );
        }

        SecurityContextHolder.getContext().setAuthentication(authentication);

        String token = tokenProvider.generateToken(authentication);
        
        log.info("User authenticated successfully: {}", user.getEmail());
        
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getFullName());
    }
    
    public AuthResponse authenticateWithGoogle(String idTokenString) {
        if (googleClientId == null || googleClientId.isBlank()) {
            throw new RuntimeException("Google client ID is not configured on server");
        }
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    JacksonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();
            
            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null) {
                throw new RuntimeException("Invalid Google ID token");
            }
            Payload payload = idToken.getPayload();
            String rawGoogleEmail = payload.getEmail();
            if (rawGoogleEmail == null || rawGoogleEmail.isBlank()) {
                throw new RuntimeException("Email not verified by Google");
            }
            boolean emailVerified = Boolean.TRUE.equals(payload.getEmailVerified());
            String fullName = (String) payload.get("name");
            if (!emailVerified) {
                throw new RuntimeException("Email not verified by Google");
            }
            String email = normalizeEmail(rawGoogleEmail);
            
            User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
            if (user == null) {
                user = new User();
                user.setEmail(email);
                user.setFullName(fullName != null ? fullName : email);
                user.setPassword(passwordEncoder.encode(generateRandomPassword()));
                user.setEmailVerified(true);
                user = userRepository.save(user);
                log.info("Created new user via Google sign-in: {}", email);
            } else {
                if (Boolean.FALSE.equals(user.getEmailVerified())) {
                    user.setEmailVerified(true);
                    userRepository.save(user);
                }
                log.info("Existing user logged in via Google: {}", email);
            }
            
            String token = tokenProvider.generateTokenFromUserId(user.getId());
            return new AuthResponse(token, user.getId(), user.getEmail(), user.getFullName());
        } catch (Exception ex) {
            throw new RuntimeException("Failed to verify Google token: " + ex.getMessage());
        }
    }
    
    private String generateRandomPassword() {
        byte[] bytes = new byte[24];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
    
    /**
     * Initiate password reset process
     * @param email User's email
     * @throws UserNotFoundException if user with given email doesn't exist
     */
    @Transactional
    public void initiatePasswordReset(String email) throws UserNotFoundException {
        String normalized = normalizeEmail(email);
        // Check rate limit first
        if (!forgotPasswordRateLimiter.isAllowed(normalized)) {
            String errorMessage = String.format(
                    "Too many password reset requests. Please try again later");
            log.warn("Forgot password rate limit exceeded for email: {}", normalized);
            throw new RuntimeException(errorMessage);
        }
        
        User user = userRepository.findByEmailIgnoreCase(normalized)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + email));
        
        // Delete any existing reset tokens for this user
        passwordResetTokenRepository.deleteByUserId(user.getId());
        
        // Generate unique token
        String token = UUID.randomUUID().toString();
        
        // Create reset token (expires in 5 minutes)
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setToken(token);
        resetToken.setUser(user);
        resetToken.setExpiryDate(LocalDateTime.now().plusMinutes(5));
        resetToken.setUsed(false);
        
        passwordResetTokenRepository.save(resetToken);
        
        // Send email
        emailService.sendPasswordResetEmail(user.getEmail(), token);
        
        log.info("Password reset initiated for user: {}", email);
    }
    
    /**
     * Validate reset token
     * @param token Reset token
     * @return true if valid, false otherwise
     */
    @Transactional(readOnly = true)
    public boolean validateResetToken(String token) {
        return passwordResetTokenRepository
                .findByTokenAndUsedFalseAndExpiryDateAfter(token, LocalDateTime.now())
                .isPresent();
    }
    
    /**
     * Reset password using token
     * @param token Reset token
     * @param newPassword New password
     */
    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = passwordResetTokenRepository
                .findByTokenAndUsedFalseAndExpiryDateAfter(token, LocalDateTime.now())
                .orElseThrow(() -> new RuntimeException("Invalid or expired reset token"));
        
        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        
        // Mark token as used
        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);
        
        log.info("Password reset successfully for user: {}", user.getEmail());
    }

    @Transactional
    public ApiResponse verifyEmail(String token) {
        if (token == null || token.isBlank()) {
            throw new RuntimeException("Invalid or expired verification link");
        }
        EmailVerificationToken verificationToken = emailVerificationTokenRepository
                .findByTokenAndUsedFalseAndExpiryDateAfter(token, LocalDateTime.now())
                .orElseThrow(() -> new RuntimeException("Invalid or expired verification link"));

        User user = verificationToken.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);

        verificationToken.setUsed(true);
        emailVerificationTokenRepository.save(verificationToken);

        log.info("Email verified for user: {}", user.getEmail());
        return new ApiResponse(true, "Your email has been verified. You can sign in now.");
    }

    /**
     * Resend verification email for password-based signups. Always appears to succeed when the
     * address is unknown or already verified, to avoid account enumeration.
     */
    @Transactional
    public ApiResponse resendVerificationEmail(String email) {
        String rateLimitKey = "email-verify:" + normalizeEmail(email);
        if (!forgotPasswordRateLimiter.isAllowed(rateLimitKey)) {
            throw new RuntimeException("Too many verification emails. Please try again later.");
        }

        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(email)).orElse(null);
        if (user == null || isEmailVerified(user)) {
            return new ApiResponse(true,
                    "If an unverified account exists for this email, we sent a new verification link.");
        }

        sendEmailVerificationForUser(user);
        log.info("Verification email resent for user: {}", user.getEmail());
        return new ApiResponse(true,
                "If an unverified account exists for this email, we sent a new verification link.");
    }

    private boolean isEmailVerified(User user) {
        return !Boolean.FALSE.equals(user.getEmailVerified());
    }

    private void sendEmailVerificationForUser(User user) {
        emailVerificationTokenRepository.deleteAllByUserId(user.getId());

        String token = UUID.randomUUID().toString();
        EmailVerificationToken verificationToken = new EmailVerificationToken();
        verificationToken.setToken(token);
        verificationToken.setUser(user);
        verificationToken.setExpiryDate(LocalDateTime.now().plusHours(24));
        verificationToken.setUsed(false);
        emailVerificationTokenRepository.save(verificationToken);

        emailService.sendEmailVerificationEmail(user.getEmail(), token);
    }
}

