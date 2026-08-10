package com.jobnotifer.service;

import com.jobnotifer.repository.PasswordResetTokenRepository;
import com.jobnotifer.repository.UserInfoRepository;
import com.jobnotifer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
    
    private final UserRepository userRepository;
    private final UserInfoRepository userInfoRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    
    /**
     * Permanently delete a user's account and all related data.
     * This removes:
     * - Password reset tokens
     * - User education info
     * - The user itself (cascades to notifiers and notifications)
     */
    @Transactional
    public void deleteAccount(Long userId) {
        // Delete tokens first to avoid FK constraints
        passwordResetTokenRepository.deleteByUserId(userId);
        // Delete education info
        userInfoRepository.deleteByUserId(userId);
        // Deleting the user will cascade to notifiers and their notifications
        userRepository.deleteById(userId);
        log.info("Deleted account and related data for user {}", userId);
    }
}

