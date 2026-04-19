package com.jobnotifer.service;

import com.jobnotifer.dto.NotificationResponse;
import com.jobnotifer.entity.HrContact;
import com.jobnotifer.entity.Notification;
import com.jobnotifer.entity.Notifier;
import com.jobnotifer.repository.HrContactRepository;
import com.jobnotifer.repository.NotificationRepository;
import com.jobnotifer.repository.NotifierRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {
    
    private final NotificationRepository notificationRepository;
    private final NotifierRepository notifierRepository;
    private final HrContactRepository hrContactRepository;
    private final LatexCompilerService latexCompilerService;
    private final CloudinaryService cloudinaryService;
    private final ResumeUpdateRateLimiter resumeUpdateRateLimiter;
    private final GeminiService geminiService;
    
    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotifications(Long userId, Long notifierId) {
        Notifier notifier = notifierRepository.findById(notifierId)
                .orElseThrow(() -> new RuntimeException("Notifier not found"));
        
        if (!notifier.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized access to notifications");
        }
        
        List<Notification> notifications = notificationRepository
                .findByNotifierIdOrderByTimestampDesc(notifierId);
        
        return notifications.stream()
                .map(n -> {
                    NotificationResponse resp = NotificationResponse.fromEntity(n);
                    if (n.getJobId() != null) {
                        hrContactRepository.findByJobId(n.getJobId()).ifPresent(hr -> {
                            resp.setHrContactEmail(hr.getEmail());
                        });
                    }
                    return resp;
                })
                .collect(Collectors.toList());
    }
    
    @Transactional
    public NotificationResponse markAsApplied(Long userId, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        
        if (!notification.getNotifier().getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized access to notification");
        }
        
        notification.setApplied(true);
        Notification updated = notificationRepository.save(notification);
        
        log.info("Notification marked as applied: {}", notificationId);
        
        return NotificationResponse.fromEntity(updated);
    }
    
    @Transactional
    public void deleteNotification(Long userId, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        
        if (!notification.getNotifier().getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized access to notification");
        }
        
        notificationRepository.deleteById(notificationId);
        
        log.info("Notification deleted: {} by user: {}", notificationId, userId);
    }
    
    @Transactional
    public NotificationResponse updateNotificationResume(Long userId, Long notificationId, String resumeLatex) {
        if (!resumeUpdateRateLimiter.isAllowed(userId)) {
            long minutesUntilNext = resumeUpdateRateLimiter.getMinutesUntilNextUpdate(userId);
            String errorMessage = String.format(
                    "Rate limit exceeded. You can update resume again in %d minutes.", minutesUntilNext);
            log.warn("Resume update rate limit exceeded for user {}, notification {}", userId, notificationId);
            throw new RuntimeException(errorMessage);
        }
        
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        
        if (!notification.getNotifier().getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized access to notification");
        }
        
        String oldPdfUrl = notification.getResumeLink();
        
        notification.setResumeLatex(resumeLatex);
        
        if (resumeLatex != null && !resumeLatex.trim().isEmpty()) {
            try {
                log.info("Compiling new resume LaTeX for notification: {}", notificationId);
                byte[] pdfBytes = latexCompilerService.compileToPdf(resumeLatex);
                
                String fileName = String.format("resume_notification_%d_%s", 
                        notificationId, UUID.randomUUID().toString().substring(0, 8));
                String pdfUrl = cloudinaryService.uploadPdfFromBytes(pdfBytes, fileName);
                
                if (pdfUrl != null) {
                    notification.setResumeLink(pdfUrl);
                    log.info("New resume PDF generated and saved for notification: {}. URL: {}", notificationId, pdfUrl);
                    
                    if (oldPdfUrl != null && !oldPdfUrl.trim().isEmpty()) {
                        log.info("Deleting old resume PDF for notification: {}", notificationId);
                        boolean deleted = cloudinaryService.deletePdfByUrl(oldPdfUrl);
                        if (deleted) {
                            log.info("Old resume PDF deleted successfully for notification: {}", notificationId);
                        } else {
                            log.warn("Failed to delete old resume PDF for notification: {}", notificationId);
                        }
                    }
                } else {
                    log.error("Failed to upload new PDF to Cloudinary for notification: {}", notificationId);
                    notification.setResumeLink(null);
                }
            } catch (com.jobnotifer.exception.LatexCompilationException e) {
                log.error("LaTeX compilation failed for notification: {}. Type: {}, Message: {}", 
                        notificationId, e.getErrorType(), e.getMessage());
                
                if (e.getErrorType() == com.jobnotifer.exception.LatexCompilationException.ErrorType.INVALID_LATEX_SYNTAX) {
                    throw new RuntimeException("Invalid LaTeX Code: " + e.getMessage(), e);
                }
                
                log.warn("Resume LaTeX compilation failed but continuing. Setting PDF URL to null.");
                notification.setResumeLink(null);
            } catch (Exception e) {
                log.error("Unexpected error during resume compilation for notification: {}.", notificationId, e);
                log.warn("Continuing without PDF due to unexpected error");
                notification.setResumeLink(null);
            }
        } else {
            notification.setResumeLink(null);
            notification.setResumeLatex(null);
        }
        
        Notification updatedNotification = notificationRepository.save(notification);
        
        log.info("Resume updated successfully for notification: {}", notificationId);

        return NotificationResponse.fromEntity(updatedNotification);
    }

    @Transactional(readOnly = true)
    public String interviewChat(Long userId, Long notificationId, String message,
                                List<Map<String, String>> conversationHistory) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        if (!notification.getNotifier().getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized access to notification");
        }

        // Use the notification-specific resume if available, otherwise fall back to notifier resume
        String resumeLatex = notification.getResumeLatex();
        if (resumeLatex == null || resumeLatex.isBlank()) {
            resumeLatex = notification.getNotifier().getResumeLatex();
        }

        return geminiService.conductInterviewChat(
                notification.getCompanyName(),
                notification.getRole(),
                notification.getJobDescription(),
                resumeLatex,
                message,
                conversationHistory
        );
    }
}

