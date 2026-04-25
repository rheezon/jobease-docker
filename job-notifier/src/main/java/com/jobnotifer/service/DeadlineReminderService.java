package com.jobnotifer.service;

import com.jobnotifer.entity.Notification;
import com.jobnotifer.entity.SchedulerState;
import com.jobnotifer.entity.User;
import com.jobnotifer.repository.NotificationRepository;
import com.jobnotifer.repository.SchedulerStateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeadlineReminderService {
    
    private final NotificationRepository notificationRepository;
    private final SchedulerStateRepository schedulerStateRepository;
    private final EmailService emailService;
    
    @Value("${scheduler.deadline-reminder.enabled:true}")
    private boolean schedulerEnabled;
    
    @Value("${app.frontend.url}")
    private String frontendUrl;
    
    private static final String SCHEDULER_NAME = "DEADLINE_REMINDER";
    
    /**
     * Runs once a day at 9:00 AM to check for upcoming deadlines
     * Cron expression: "0 0 9 * * ?" means every day at 9:00 AM
     */
    @Scheduled(cron = "${scheduler.deadline-reminder.cron:0 0 9 * * ?}")
    @Transactional
    public void checkDeadlinesAndSendReminders() {
        if (!schedulerEnabled) {
            log.debug("Deadline reminder scheduler is disabled");
            return;
        }
        
        SchedulerState schedulerState = getOrCreateSchedulerState();
        
        if (!schedulerState.getEnabled()) {
            log.debug("Deadline reminder scheduler is disabled in database");
            return;
        }
        
        LocalDateTime currentTime = LocalDateTime.now();
        log.info("Starting deadline reminder scheduler run {}", schedulerState.getCurrentRun() + 1);
        
        List<Notification> allNotifications = notificationRepository.findAll().stream()
                .filter(n -> !n.getApplied())
                .filter(n -> n.getDeadline() != null && !n.getDeadline().trim().isEmpty())
                .toList();
        
        log.info("Found {} unapplied notifications with deadlines", allNotifications.size());
        
        // Get tomorrow's date for comparison
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        
        // Group notifications by user for jobs with deadline tomorrow
        Map<User, List<Notification>> userNotificationsMap = new HashMap<>();
        
        for (Notification notification : allNotifications) {
            try {
                LocalDate deadlineDate = parseDeadline(notification.getDeadline());
                
                if (deadlineDate != null && deadlineDate.equals(tomorrow)) {
                    User user = notification.getNotifier().getUser();
                    userNotificationsMap
                            .computeIfAbsent(user, k -> new ArrayList<>())
                            .add(notification);
                }
            } catch (Exception e) {
                log.warn("Error parsing deadline for notification {}: {}", 
                        notification.getId(), notification.getDeadline(), e);
            }
        }
        
        log.info("Found {} users with jobs expiring tomorrow", userNotificationsMap.size());
        
        int emailsSent = 0;
        for (Map.Entry<User, List<Notification>> entry : userNotificationsMap.entrySet()) {
            User user = entry.getKey();
            List<Notification> notifications = entry.getValue();
            
            try {
                sendDeadlineReminderEmail(user, notifications, tomorrow);
                emailsSent++;
                log.info("Sent deadline reminder to user {} for {} jobs", 
                        user.getEmail(), notifications.size());
            } catch (Exception e) {
                log.error("Failed to send deadline reminder to user {}", user.getEmail(), e);
            }
        }
        
        schedulerState.setCurrentRun(schedulerState.getCurrentRun() + 1);
        schedulerState.setLastRunTimestamp(currentTime);
        schedulerStateRepository.save(schedulerState);
        
        log.info("Deadline reminder scheduler run completed. Sent {} reminder emails", emailsSent);
    }
    
    /**
     * Parse deadline string to LocalDate
     * Expects yyyy-MM-dd format as specified in the AI prompt
     */
    private LocalDate parseDeadline(String deadline) {
        if (deadline == null || deadline.trim().isEmpty()) {
            return null;
        }
        
        try {
            // The AI is configured to return dates in yyyy-MM-dd format
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
            return LocalDate.parse(deadline.trim(), formatter);
        } catch (DateTimeParseException e) {
            log.warn("Could not parse deadline (expected yyyy-MM-dd format): {}", deadline, e);
            return null;
        }
    }
    
    /**
     * Send deadline reminder email to user
     */
    private void sendDeadlineReminderEmail(User user, List<Notification> notifications, LocalDate deadline) {
        String subject = "Reminder: Job Application Deadlines Tomorrow!";
        String body = buildDeadlineReminderEmailBody(user, notifications, deadline);
        emailService.sendEmail(user.getEmail(), subject, body);
    }
    
    /**
     * Build deadline reminder email body
     */
    private String buildDeadlineReminderEmailBody(User user, List<Notification> notifications, LocalDate deadline) {
        StringBuilder body = new StringBuilder();
        
        body.append("Hello ").append(user.getFullName()).append(",\n\n");
        
        if (notifications.size() == 1) {
            body.append("This is a reminder that you have 1 job application deadline tomorrow (")
                .append(deadline.format(DateTimeFormatter.ofPattern("MMM dd, yyyy")))
                .append("):\n\n");
        } else {
            body.append("This is a reminder that you have ")
                .append(notifications.size())
                .append(" job application deadlines tomorrow (")
                .append(deadline.format(DateTimeFormatter.ofPattern("MMM dd, yyyy")))
                .append("):\n\n");
        }
        
        // List all jobs
        for (int i = 0; i < notifications.size(); i++) {
            Notification notification = notifications.get(i);
            body.append(i + 1).append(". ")
                .append(notification.getCompanyName());
            
            if (notification.getRole() != null && !notification.getRole().isEmpty()) {
                body.append(" - ").append(notification.getRole());
            }
            
            body.append("\n");
            
            if (notification.getJobLink() != null && !notification.getJobLink().isEmpty()) {
                body.append("   Job Link: ").append(notification.getJobLink()).append("\n");
            }
            
            if (notification.getResumeLink() != null && !notification.getResumeLink().isEmpty()) {
                body.append("   Resume: ").append(notification.getResumeLink()).append("\n");
            }
            
            body.append("\n");
        }
        
        body.append("Don't miss these opportunities! Apply before the deadline.\n\n");
        body.append("View all your notifications: ").append(frontendUrl).append("/notifications\n\n");
        body.append("Best regards,\n");
        body.append("JobKick Team");
        
        return body.toString();
    }
    
    /**
     * Get or create scheduler state for deadline reminder
     */
    private SchedulerState getOrCreateSchedulerState() {
        return schedulerStateRepository.findBySchedulerName(SCHEDULER_NAME)
                .orElseGet(() -> {
                    SchedulerState newState = new SchedulerState();
                    newState.setSchedulerName(SCHEDULER_NAME);
                    newState.setCurrentRun(0);
                    newState.setLastRunTimestamp(LocalDateTime.now());
                    newState.setEnabled(true);
                    SchedulerState saved = schedulerStateRepository.save(newState);
                    log.info("Created new scheduler state for {}", SCHEDULER_NAME);
                    return saved;
                });
    }
}

