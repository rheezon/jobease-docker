package com.jobnotifer.service;

import com.jobnotifer.dto.NotifierRequest;
import com.jobnotifer.dto.NotifierResponse;
import com.jobnotifer.entity.Notifier;
import com.jobnotifer.entity.User;
import com.jobnotifer.repository.NotificationRepository;
import com.jobnotifer.repository.NotifierRepository;
import com.jobnotifer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotifierService {
    
    private final NotifierRepository notifierRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final LatexCompilerService latexCompilerService;
    private final CloudinaryService cloudinaryService;
    private final ResumeUpdateRateLimiter resumeUpdateRateLimiter;
    private final NotifierBackfillService notifierBackfillService;
    
    @Value("${notifier.max-per-user}")
    private int maxNotifiersPerUser;
    
    @Transactional
    public NotifierResponse createNotifier(Long userId, NotifierRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Determine isDraft status
        boolean isDraft = request.getIsDraft() != null && request.getIsDraft();
        
        boolean isActive;
        
        if (isDraft) {
            isActive = false;
            log.info("User {} creating notifier as draft (inactive)", userId);
        } 
        else if (request.getIsActive() != null && !request.getIsActive()) {
            isActive = false;
            log.info("User {} creating notifier as inactive (explicitly requested)", userId);
        } 
        else {
            long currentActiveCount = notifierRepository.countByUserIdAndIsActiveTrue(userId);
            boolean canBeActive = currentActiveCount < maxNotifiersPerUser;
            
            if (canBeActive) {
                isActive = true;
                log.info("User {} creating notifier as active ({}/{} active notifiers)", 
                        userId, currentActiveCount + 1, maxNotifiersPerUser);
            } else {
                isActive = false;
                log.warn("User {} creating notifier as inactive - active limit reached ({}/{})", 
                        userId, currentActiveCount, maxNotifiersPerUser);
            }
        }
        
        Notifier notifier = new Notifier();
        notifier.setUser(user);
        notifier.setName(request.getName());
        notifier.setRole(request.getRole());
        notifier.setCity(request.getCity());
        notifier.setSalaryExpectation(request.getSalaryExpectation());
        notifier.setCompaniesPreference(request.getCompaniesPreference());
        notifier.setExperience(request.getExperience());
        notifier.setNoticePeriod(request.getNoticePeriod());
        notifier.setSkills(request.getSkills());
        notifier.setResumeLatex(request.getResumeLatex());
        notifier.setAdditionalPreferences(request.getAdditionalPreferences());
        notifier.setIsDraft(isDraft);
        notifier.setIsActive(isActive);
        
        Notifier savedNotifier = notifierRepository.save(notifier);
        
        if (request.getResumeLatex() != null && !request.getResumeLatex().trim().isEmpty()) {
            try {
                log.info("Compiling resume LaTeX for new notifier: {}", savedNotifier.getId());
                byte[] pdfBytes = latexCompilerService.compileToPdf(request.getResumeLatex());
                
                String fileName = String.format("resume_%d_%d", savedNotifier.getId(), System.currentTimeMillis());
                String pdfUrl = cloudinaryService.uploadPdfFromBytes(pdfBytes, fileName);
                
                if (pdfUrl != null) {
                    savedNotifier.setLatexResumePdfUrl(pdfUrl);
                    savedNotifier = notifierRepository.save(savedNotifier);
                    log.info("Resume PDF generated and saved for notifier: {}. URL: {}", savedNotifier.getId(), pdfUrl);
                } else {
                    log.error("Failed to upload PDF to Cloudinary for notifier: {}", savedNotifier.getId());
                }
            } catch (com.jobnotifer.exception.LatexCompilationException e) {
                log.error("LaTeX compilation failed for notifier: {}. Error: {}", savedNotifier.getId(), e.getMessage());
                // Don't fail notifier creation, but log the issue
                log.warn("Notifier {} created without PDF due to LaTeX error", savedNotifier.getId());
            } catch (Exception e) {
                log.error("Failed to compile/upload resume PDF for notifier: {}. Continuing without PDF.", savedNotifier.getId(), e);
            }
        }
        
        log.info("Notifier created successfully: {} for user: {}", savedNotifier.getId(), userId);

        // Trigger async backfill of recent jobs for every new notifier
        if (!isDraft) {
            notifierBackfillService.backfillRecentJobs(savedNotifier);
        }

        NotifierResponse response = NotifierResponse.fromEntity(savedNotifier);
        response.setUnreadNotificationsCount(0L);
        return response;
    }
    
    @Transactional
    public NotifierResponse updateNotifier(Long userId, Long notifierId, NotifierRequest request) {
        Notifier notifier = notifierRepository.findById(notifierId)
                .orElseThrow(() -> new RuntimeException("Notifier not found"));
        
        if (!notifier.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized access to notifier");
        }
        
        // Update notifier fields
        notifier.setName(request.getName());
        notifier.setRole(request.getRole());
        notifier.setCity(request.getCity());
        notifier.setSalaryExpectation(request.getSalaryExpectation());
        notifier.setCompaniesPreference(request.getCompaniesPreference());
        notifier.setExperience(request.getExperience());
        notifier.setNoticePeriod(request.getNoticePeriod());
        notifier.setSkills(request.getSkills());
        notifier.setResumeLatex(request.getResumeLatex());
        notifier.setAdditionalPreferences(request.getAdditionalPreferences());
        
        if (request.getIsDraft() != null) {
            boolean newDraftStatus = request.getIsDraft();
            notifier.setIsDraft(newDraftStatus);
            
            if (newDraftStatus && notifier.getIsActive()) {
                notifier.setIsActive(false);
                log.info("Notifier {} set to draft - automatically deactivated", notifierId);
            }
        }
        
        Notifier updatedNotifier = notifierRepository.save(notifier);
        
        log.info("Notifier updated successfully: {}", notifierId);
        
        NotifierResponse response = NotifierResponse.fromEntity(updatedNotifier);
        response.setUnreadNotificationsCount(
                notificationRepository.countByNotifierIdAndAppliedFalse(notifierId)
        );
        return response;
    }
    
    @Transactional
    public NotifierResponse updateNotifierResume(Long userId, Long notifierId, String resumeLatex) {
        if (!resumeUpdateRateLimiter.isAllowed(userId)) {
            long minutesUntilNext = resumeUpdateRateLimiter.getMinutesUntilNextUpdate(userId);
            String errorMessage = String.format(
                    "Rate limit exceeded. You can update resume again in %d minutes.", minutesUntilNext);
            log.warn("Resume update rate limit exceeded for user {}, notifier {}", userId, notifierId);
            throw new RuntimeException(errorMessage);
        }
        
        Notifier notifier = notifierRepository.findById(notifierId)
                .orElseThrow(() -> new RuntimeException("Notifier not found"));
        
        if (!notifier.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized access to notifier");
        }
        
        // Store old PDF URL for later deletion (after successful compilation)
        String oldPdfUrl = notifier.getLatexResumePdfUrl();
        
        notifier.setResumeLatex(resumeLatex);
        
        if (resumeLatex != null && !resumeLatex.trim().isEmpty()) {
            try {
                log.info("Compiling new resume LaTeX for notifier: {}", notifierId);
                byte[] pdfBytes = latexCompilerService.compileToPdf(resumeLatex);
                
                String fileName = String.format("resume_%d_%d", notifierId, System.currentTimeMillis());
                String pdfUrl = cloudinaryService.uploadPdfFromBytes(pdfBytes, fileName);
                
                if (pdfUrl != null) {
                    notifier.setLatexResumePdfUrl(pdfUrl);
                    log.info("New resume PDF generated and saved for notifier: {}. URL: {}", notifierId, pdfUrl);
                    
                    // Delete old PDF only after successful compilation and upload
                    if (oldPdfUrl != null && !oldPdfUrl.trim().isEmpty()) {
                        log.info("Deleting old resume PDF for notifier: {}", notifierId);
                        boolean deleted = cloudinaryService.deletePdfByUrl(oldPdfUrl);
                        if (deleted) {
                            log.info("Old resume PDF deleted successfully for notifier: {}", notifierId);
                        } else {
                            log.warn("Failed to delete old resume PDF for notifier: {}", notifierId);
                        }
                    }
                } else {
                    log.error("Failed to upload new PDF to Cloudinary for notifier: {}", notifierId);
                    notifier.setLatexResumePdfUrl(null);
                }
            } catch (com.jobnotifer.exception.LatexCompilationException e) {
                log.error("LaTeX compilation failed for notifier: {}. Type: {}, Message: {}", 
                        notifierId, e.getErrorType(), e.getMessage());
                
                // If it's invalid LaTeX syntax, throw error to user (transaction will rollback)
                if (e.getErrorType() == com.jobnotifer.exception.LatexCompilationException.ErrorType.INVALID_LATEX_SYNTAX) {
                    throw new RuntimeException("Invalid LaTeX Code: " + e.getMessage(), e);
                }
                
                // For other errors (service unavailable, timeout, etc.), continue without PDF
                log.warn("Resume LaTeX compilation failed but continuing. Setting PDF URL to null.");
                notifier.setLatexResumePdfUrl(null);
            } catch (Exception e) {
                log.error("Unexpected error during resume compilation for notifier: {}.", notifierId, e);
                log.warn("Continuing without PDF due to unexpected error");
                notifier.setLatexResumePdfUrl(null);
            }
        } else {
            notifier.setLatexResumePdfUrl(null);
        }
        
        Notifier updatedNotifier = notifierRepository.save(notifier);
        
        log.info("Resume updated successfully for notifier: {}", notifierId);
        
        NotifierResponse response = NotifierResponse.fromEntity(updatedNotifier);
        response.setUnreadNotificationsCount(
                notificationRepository.countByNotifierIdAndAppliedFalse(notifierId)
        );
        return response;
    }
    
    @Transactional(readOnly = true)
    public List<NotifierResponse> getUserNotifiers(Long userId) {
        List<Notifier> notifiers = notifierRepository.findByUserId(userId);
        
        return notifiers.stream()
                .map(notifier -> {
                    NotifierResponse response = NotifierResponse.fromEntity(notifier);
                    response.setUnreadNotificationsCount(
                            notificationRepository.countByNotifierIdAndAppliedFalse(notifier.getId())
                    );
                    return response;
                })
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public NotifierResponse getNotifier(Long userId, Long notifierId) {
        Notifier notifier = notifierRepository.findById(notifierId)
                .orElseThrow(() -> new RuntimeException("Notifier not found"));
        
        if (!notifier.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized access to notifier");
        }
        
        NotifierResponse response = NotifierResponse.fromEntity(notifier);
        response.setUnreadNotificationsCount(
                notificationRepository.countByNotifierIdAndAppliedFalse(notifierId)
        );
        return response;
    }
    
    @Transactional
    public void deleteNotifier(Long userId, Long notifierId) {
        Notifier notifier = notifierRepository.findById(notifierId)
                .orElseThrow(() -> new RuntimeException("Notifier not found"));
        
        if (!notifier.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized access to notifier");
        }
        
        notifierRepository.delete(notifier);
        log.info("Notifier deleted successfully: {}", notifierId);
    }
    
    /**
     * Toggle the active status of a notifier
     * @param userId User ID
     * @param notifierId Notifier ID
     * @return Updated NotifierResponse
     */
    @Transactional
    public NotifierResponse toggleNotifierActive(Long userId, Long notifierId) {
        Notifier notifier = notifierRepository.findById(notifierId)
                .orElseThrow(() -> new RuntimeException("Notifier not found"));
        
        if (!notifier.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized access to notifier");
        }
        
        if (notifier.getIsDraft()) {
            log.warn("User {} attempted to toggle notifier {} but it's in draft mode", userId, notifierId);
            throw new RuntimeException("Cannot activate a draft notifier. Please complete the draft first by setting isDraft to false.");
        }
        
        boolean currentStatus = notifier.getIsActive();
        boolean newStatus = !currentStatus;
        
        // If trying to activate, check if there's space
        if (newStatus) {
            long currentActiveCount = notifierRepository.countByUserIdAndIsActiveTrue(userId);
            if (currentActiveCount >= maxNotifiersPerUser) {
                log.warn("User {} attempted to activate notifier {} but has reached the limit of {} active notifiers", 
                        userId, notifierId, maxNotifiersPerUser);
                throw new RuntimeException(String.format(
                        "Maximum active notifier limit reached. You can only have up to %d active notifiers. Deactivate an existing notifier first.", 
                        maxNotifiersPerUser));
            }
            log.info("User {} activating notifier {} ({}/{} active notifiers)", 
                    userId, notifierId, currentActiveCount + 1, maxNotifiersPerUser);
        } else {
            log.info("User {} deactivating notifier {}", userId, notifierId);
        }
        
        notifier.setIsActive(newStatus);
        Notifier updatedNotifier = notifierRepository.save(notifier);
        
        log.info("Notifier {} status toggled to {}", notifierId, newStatus ? "active" : "inactive");
        
        NotifierResponse response = NotifierResponse.fromEntity(updatedNotifier);
        response.setUnreadNotificationsCount(
                notificationRepository.countByNotifierIdAndAppliedFalse(notifierId)
        );
        return response;
    }
    
    /**
     * Get notifier limit information for a user
     * @param userId User ID
     * @return Map with active count, total count, max active limit, and remaining active slots
     */
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getNotifierLimitInfo(Long userId) {
        long totalCount = notifierRepository.countByUserId(userId);
        long activeCount = notifierRepository.countByUserIdAndIsActiveTrue(userId);
        long remainingActiveSlots = Math.max(0, maxNotifiersPerUser - activeCount);
        
        return java.util.Map.of(
                "totalNotifiers", totalCount,
                "activeNotifiers", activeCount,
                "maxActiveNotifiers", maxNotifiersPerUser,
                "remainingActiveSlots", remainingActiveSlots,
                "canActivateMore", remainingActiveSlots > 0
        );
    }
}

