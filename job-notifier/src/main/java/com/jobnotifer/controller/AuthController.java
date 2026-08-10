package com.jobnotifer.controller;

import com.jobnotifer.dto.*;
import com.jobnotifer.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {
    
    private final AuthService authService;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String appFrontendUrl;
    
    @PostMapping("/signup")
    public ResponseEntity<SignupResponse> registerUser(@Valid @RequestBody SignupRequest signupRequest) {
        SignupResponse response = authService.registerUser(signupRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Email links use this URL without {@code format=json}: verifies then redirects to the SPA login page.
     * The SPA calls with {@code format=json} to get JSON instead of an HTTP redirect.
     */
    @GetMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(
            @RequestParam String token,
            @RequestParam(value = "format", required = false) String format) {
        boolean asJson = "json".equalsIgnoreCase(format);
        try {
            ApiResponse body = authService.verifyEmail(token);
            if (asJson) {
                return ResponseEntity.ok(body);
            }
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(buildFrontendLoginVerifyUrl("1", null)))
                    .build();
        } catch (RuntimeException ex) {
            if (asJson) {
                throw ex;
            }
            log.warn("Email verification link failed (redirecting to login): {}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(buildFrontendLoginVerifyUrl("0", "invalid_or_expired")))
                    .build();
        }
    }

    private String trimTrailingSlashes(String raw) {
        if (raw == null) {
            return "http://localhost:5173";
        }
        String s = raw.trim();
        while (s.endsWith("/")) {
            s = s.substring(0, s.length() - 1);
        }
        return s.isEmpty() ? "http://localhost:5173" : s;
    }

    private String buildFrontendLoginVerifyUrl(String emailVerifiedFlag, String verifyReason) {
        String base = trimTrailingSlashes(appFrontendUrl);
        UriComponentsBuilder b = UriComponentsBuilder.fromUriString(base + "/login");
        b.queryParam("emailVerified", emailVerifiedFlag);
        if (verifyReason != null) {
            b.queryParam("verifyReason", verifyReason);
        }
        return b.encode().build().toUriString();
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<ApiResponse> resendVerification(@Valid @RequestBody ForgotPasswordRequest request) {
        ApiResponse response = authService.resendVerificationEmail(request.getEmail());
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        AuthResponse response = authService.authenticateUser(loginRequest);
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/google")
    public ResponseEntity<AuthResponse> authenticateWithGoogle(@Valid @RequestBody GoogleLoginRequest request) {
        AuthResponse response = authService.authenticateWithGoogle(request.getIdToken());
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) throws Exception {
        authService.initiatePasswordReset(request.getEmail());
        return ResponseEntity.ok(new ApiResponse(true, "Reset link sent to email"));
    }
    
    @GetMapping("/validate-reset-token")
    public ResponseEntity<Map<String, Boolean>> validateResetToken(@RequestParam String token) {
        boolean isValid = authService.validateResetToken(token);
        if (!isValid) {
            return ResponseEntity.badRequest().body(Map.of("valid", false));
        }
        return ResponseEntity.ok(Map.of("valid", true));
    }
    
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(new ApiResponse(true, "Password reset successful"));
    }
    
    @GetMapping("/test")
    public ResponseEntity<ApiResponse> testEndpoint() {
        return ResponseEntity.ok(new ApiResponse(true, "Auth endpoints are working!"));
    }
}

