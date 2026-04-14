package com.jobnotifer.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simple in-memory rate limiter for forgot password requests
 * Prevents spam and abuse of password reset functionality
 */
@Service
@Slf4j
public class ForgotPasswordRateLimiter {
    
    // Map to store email -> last request timestamp
    private final Map<String, LocalDateTime> requestTimestamps = new ConcurrentHashMap<>();
    
    @Value("${rate-limit.forgot-password.cooldown-minutes}")
    private int cooldownMinutes;
    
    /**
     * Check if a forgot password request is allowed for the given email
     * @param email User's email
     * @return true if allowed, false if rate limit exceeded
     */
    public boolean isAllowed(String email) {
        LocalDateTime lastRequest = requestTimestamps.get(email);
        LocalDateTime now = LocalDateTime.now();
        
        if (lastRequest == null) {
            // First request from this email
            requestTimestamps.put(email, now);
            log.info("Forgot password request allowed for email: {}", email);
            return true;
        }
        
        LocalDateTime nextAllowedTime = lastRequest.plusMinutes(cooldownMinutes);
        
        if (now.isBefore(nextAllowedTime)) {
            // Still in cooldown period
            long minutesRemaining = java.time.Duration.between(now, nextAllowedTime).toMinutes();
            log.warn("Forgot password rate limit exceeded for email: {}. {} minutes remaining", 
                    email, minutesRemaining);
            return false;
        }
        
        // Cooldown period has passed, allow request
        requestTimestamps.put(email, now);
        log.info("Forgot password request allowed for email: {} (cooldown period passed)", email);
        return true;
    }
    
    /**
     * Get the number of minutes until the next allowed request
     * @param email User's email
     * @return minutes until next request is allowed, or 0 if allowed now
     */
    public long getMinutesUntilNextRequest(String email) {
        LocalDateTime lastRequest = requestTimestamps.get(email);
        
        if (lastRequest == null) {
            return 0; // No previous request, allowed now
        }
        
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime nextAllowedTime = lastRequest.plusMinutes(cooldownMinutes);
        
        if (now.isAfter(nextAllowedTime)) {
            return 0; // Cooldown period passed, allowed now
        }
        
        return java.time.Duration.between(now, nextAllowedTime).toMinutes() + 1;
    }
    
    /**
     * Clear rate limit for a specific email (for testing purposes)
     * @param email User's email
     */
    public void clearRateLimit(String email) {
        requestTimestamps.remove(email);
        log.info("Rate limit cleared for email: {}", email);
    }
    
    /**
     * Clear all rate limits (for testing purposes)
     */
    public void clearAllRateLimits() {
        requestTimestamps.clear();
        log.info("All rate limits cleared");
    }
}

