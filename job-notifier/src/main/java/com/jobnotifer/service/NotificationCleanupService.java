package com.jobnotifer.service;

import com.jobnotifer.entity.Notification;
import com.jobnotifer.entity.SchedulerState;
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
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationCleanupService {

    private final NotificationRepository notificationRepository;
    private final SchedulerStateRepository schedulerStateRepository;

    @Value("${scheduler.notification-cleanup.enabled:true}")
    private boolean schedulerEnabled;

    @Value("${scheduler.notification-cleanup.days-threshold:10}")
    private int daysThreshold;

    private static final String SCHEDULER_NAME = "NOTIFICATION_CLEANUP";

    /**
     * Runs once daily at 2:00 AM
     * Cron: "0 0 2 * * ?" → every day at 2 AM
     */
    @Scheduled(cron = "${scheduler.notification-cleanup.cron:0 0 2 * * ?}")
    @Transactional
    public void cleanupOldNotifications() {
        if (!schedulerEnabled) {
            log.debug("Notification cleanup scheduler is disabled via configuration.");
            return;
        }

        SchedulerState schedulerState = getOrCreateSchedulerState();

        if (!schedulerState.getEnabled()) {
            log.debug("Notification cleanup scheduler is disabled in DB.");
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDate thresholdDate = LocalDate.now().minusDays(daysThreshold);

        log.info("Starting Notification Cleanup Scheduler Run #{}", schedulerState.getCurrentRun() + 1);

        // Fetch all notifications
        List<Notification> allNotifications = notificationRepository.findAll();

        int removedCount = 0;

        for (Notification notification : allNotifications) {
            try {
                LocalDate createdDate = notification.getCreatedAt().toLocalDate();
                LocalDate deadlineDate = parseDeadline(notification.getDeadline());
    
                if (createdDate.isBefore(thresholdDate)
                        && deadlineDate != null
                        && deadlineDate.isBefore(LocalDate.now())) {
    
                    notificationRepository.delete(notification);
                    removedCount++;
                }
            } catch (Exception e) {
                log.warn("Error checking notification {}: {}", notification.getId(), e.getMessage());
            }
        }

        schedulerState.setCurrentRun(schedulerState.getCurrentRun() + 1);
        schedulerState.setLastRunTimestamp(now);
        schedulerStateRepository.save(schedulerState);

        log.info("Notification Cleanup Scheduler Completed. Deleted {} old notifications.", removedCount);
    }

    /**
     * Parse deadline string to LocalDate
     */
    private LocalDate parseDeadline(String deadline) {
        if (deadline == null || deadline.trim().isEmpty()) return null;

        try {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
            return LocalDate.parse(deadline.trim(), formatter);
        } catch (DateTimeParseException e) {
            log.warn("Could not parse deadline: {}", deadline);
            return null;
        }
    }

    /**
     * Get or create scheduler state for cleanup
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
