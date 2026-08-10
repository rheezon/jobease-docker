package com.jobnotifer.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ResumeUpdateRateLimiter {
    
    @Value("${rate-limit.resume-update.cooldown-minutes:60}")
    private int cooldownMinutes;
    
    @Value("${rate-limit.resume-update.cooldown-times:2}")
    private int cooldownTimes;
    
    private final Map<Long, List<LocalDateTime>> updateHistory = new ConcurrentHashMap<>();
    
    /**
     * Check if user is allowed to update resume
     * @param userId The user ID
     * @return true if allowed, false if rate limit exceeded
     */
    public boolean isAllowed(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        List<LocalDateTime> updates = updateHistory.getOrDefault(userId, new ArrayList<>());
        
        LocalDateTime windowStart = now.minusMinutes(cooldownMinutes);
        List<LocalDateTime> recentUpdates = updates.stream()
                .filter(timestamp -> timestamp.isAfter(windowStart))
                .collect(Collectors.toList());
        
        if (recentUpdates.size() >= cooldownTimes) {
            LocalDateTime oldestUpdate = recentUpdates.stream()
                    .min(LocalDateTime::compareTo)
                    .orElse(now);
            LocalDateTime nextAllowedTime = oldestUpdate.plusMinutes(cooldownMinutes);
            
            long minutesRemaining = java.time.Duration.between(now, nextAllowedTime).toMinutes();
            log.warn("Resume update rate limit exceeded for user {}. {} updates in last {} minutes. Minutes until next update: {}", 
                    userId, recentUpdates.size(), cooldownMinutes, minutesRemaining);
            return false;
        }
        
        recentUpdates.add(now);
        updateHistory.put(userId, recentUpdates);
        log.info("Resume update allowed for user {} ({}/{} updates in last {} minutes)", 
                userId, recentUpdates.size(), cooldownTimes, cooldownMinutes);
        return true;
    }
    
    /**
     * Get minutes until next update is allowed
     * @param userId The user ID
     * @return Minutes until next update, or 0 if allowed now
     */
    public long getMinutesUntilNextUpdate(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        List<LocalDateTime> updates = updateHistory.getOrDefault(userId, new ArrayList<>());
        
        if (updates.isEmpty()) {
            return 0;
        }
        
        LocalDateTime windowStart = now.minusMinutes(cooldownMinutes);
        List<LocalDateTime> recentUpdates = updates.stream()
                .filter(timestamp -> timestamp.isAfter(windowStart))
                .collect(Collectors.toList());
        
        if (recentUpdates.size() < cooldownTimes) {
            return 0;
        }
        
        LocalDateTime oldestUpdate = recentUpdates.stream()
                .min(LocalDateTime::compareTo)
                .orElse(now);
        LocalDateTime nextAllowedTime = oldestUpdate.plusMinutes(cooldownMinutes);
        
        if (now.isBefore(nextAllowedTime)) {
            return java.time.Duration.between(now, nextAllowedTime).toMinutes();
        }
        
        return 0;
    }
    
    /**
     * Clear rate limit for a user (admin action)
     * @param userId The user ID
     */
    public void clearUserLimit(Long userId) {
        updateHistory.remove(userId);
        log.info("Resume update rate limit cleared for user {}", userId);
    }
}

