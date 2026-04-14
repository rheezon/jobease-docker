package com.jobnotifer.service;

import com.jobnotifer.dto.AuthResponse;
import com.jobnotifer.dto.LoginRequest;
import com.jobnotifer.dto.SignupRequest;
import com.jobnotifer.entity.PasswordResetToken;
import com.jobnotifer.entity.User;
import com.jobnotifer.exception.UserNotFoundException;
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
    private final EmailService emailService;
    private final ForgotPasswordRateLimiter forgotPasswordRateLimiter;
    
    @Value("${GOOGLE_CLIENT_ID:}")
    private String googleClientId;
    
    @Transactional
    public AuthResponse registerUser(SignupRequest signupRequest) {
        if (userRepository.existsByEmail(signupRequest.getEmail())) {
            throw new RuntimeException("Email already exists!");
        }
        
        User user = new User();
        user.setEmail(signupRequest.getEmail());
        user.setPassword(passwordEncoder.encode(signupRequest.getPassword()));
        user.setFullName(signupRequest.getFullName());
        
        User savedUser = userRepository.save(user);
        
        String token = tokenProvider.generateTokenFromUserId(savedUser.getId());
        
        log.info("User registered successfully: {}", savedUser.getEmail());
        
        return new AuthResponse(token, savedUser.getId(), savedUser.getEmail(), savedUser.getFullName());
    }
    
    public AuthResponse authenticateUser(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getEmail(),
                        loginRequest.getPassword()
                )
        );
        
        SecurityContextHolder.getContext().setAuthentication(authentication);
        
        String token = tokenProvider.generateToken(authentication);
        
        User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
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
            String email = payload.getEmail();
            boolean emailVerified = Boolean.TRUE.equals(payload.getEmailVerified());
            String fullName = (String) payload.get("name");
            
            if (email == null || !emailVerified) {
                throw new RuntimeException("Email not verified by Google");
            }
            
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                user = new User();
                user.setEmail(email);
                user.setFullName(fullName != null ? fullName : email);
                user.setPassword(passwordEncoder.encode(generateRandomPassword()));
                user = userRepository.save(user);
                log.info("Created new user via Google sign-in: {}", email);
            } else {
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
        // Check rate limit first
        if (!forgotPasswordRateLimiter.isAllowed(email)) {
            String errorMessage = String.format(
                    "Too many password reset requests. Please try again later");
            log.warn("Forgot password rate limit exceeded for email: {}", email);
            throw new RuntimeException(errorMessage);
        }
        
        User user = userRepository.findByEmail(email)
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
        emailService.sendPasswordResetEmail(email, token);
        
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
}

