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
public class PendingJobsDigestService {

    private final NotificationRepository notificationRepository;
    private final SchedulerStateRepository schedulerStateRepository;
    private final EmailService emailService;

    @Value("${scheduler.pending-digest.enabled:true}")
    private boolean schedulerEnabled;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    private static final String SCHEDULER_NAME = "PENDING_JOBS_DIGEST";

    /**
     * Runs daily at a configurable time (default 9:00 AM).
     * Sends a digest email to each user listing their pending (unapplied) jobs,
     * highlighting those with upcoming deadlines.
     */
    @Scheduled(cron = "${scheduler.pending-digest.cron:0 0 9 * * ?}")
    @Transactional
    public void sendPendingJobsDigest() {
        if (!schedulerEnabled) {
            log.info("Pending jobs digest scheduler is disabled via config");
            return;
        }

        SchedulerState schedulerState = getOrCreateSchedulerState();

        if (!schedulerState.getEnabled()) {
            log.info("Pending jobs digest scheduler is disabled in database");
            return;
        }

        LocalDateTime currentTime = LocalDateTime.now();
        log.info("Starting pending jobs digest run {}", schedulerState.getCurrentRun() + 1);

        // Get all unapplied notifications
        List<Notification> allPending = notificationRepository.findAll().stream()
                .filter(n -> !n.getApplied())
                .toList();

        log.info("Found {} total unapplied jobs", allPending.size());

        // Group by user
        Map<User, List<Notification>> userJobsMap = new HashMap<>();
        for (Notification n : allPending) {
            User user = n.getNotifier().getUser();
            userJobsMap.computeIfAbsent(user, k -> new ArrayList<>()).add(n);
        }

        int emailsSent = 0;
        for (Map.Entry<User, List<Notification>> entry : userJobsMap.entrySet()) {
            User user = entry.getKey();
            List<Notification> pendingJobs = entry.getValue();

            if (pendingJobs.isEmpty()) continue;

            // Separate into expiring soon (within 3 days) and others
            LocalDate today = LocalDate.now();
            List<Notification> expiringSoon = new ArrayList<>();
            List<Notification> otherPending = new ArrayList<>();

            for (Notification job : pendingJobs) {
                LocalDate deadline = parseDeadline(job.getDeadline());
                if (deadline != null && !deadline.isBefore(today) && deadline.isBefore(today.plusDays(4))) {
                    expiringSoon.add(job);
                } else {
                    otherPending.add(job);
                }
            }

            try {
                sendDigestEmail(user, pendingJobs.size(), expiringSoon, otherPending);
                emailsSent++;
                log.info("Sent pending jobs digest to {} — {} total, {} expiring soon",
                        user.getEmail(), pendingJobs.size(), expiringSoon.size());
            } catch (Exception e) {
                log.error("Failed to send pending jobs digest to {}", user.getEmail(), e);
            }
        }

        schedulerState.setCurrentRun(schedulerState.getCurrentRun() + 1);
        schedulerState.setLastRunTimestamp(currentTime);
        schedulerStateRepository.save(schedulerState);

        log.info("Pending jobs digest completed. Sent {} emails", emailsSent);
    }

    private void sendDigestEmail(User user, int totalPending,
                                  List<Notification> expiringSoon,
                                  List<Notification> otherPending) {
        String subject = expiringSoon.isEmpty()
                ? String.format("You have %d pending job applications", totalPending)
                : String.format("%d jobs expiring soon! %d total pending", expiringSoon.size(), totalPending);

        String body = buildDigestBody(user, totalPending, expiringSoon, otherPending);
        emailService.sendEmail(user.getEmail(), subject, body);
    }

    private String buildDigestBody(User user, int totalPending,
                                    List<Notification> expiringSoon,
                                    List<Notification> otherPending) {
        StringBuilder body = new StringBuilder();
        LocalDate today = LocalDate.now();

        body.append("Hello ").append(user.getFullName()).append(",\n\n");
        body.append("Here's your daily job application summary:\n\n");
        body.append("Total pending applications: ").append(totalPending).append("\n\n");

        // Expiring soon section
        if (!expiringSoon.isEmpty()) {
            body.append("EXPIRING SOON (within 3 days) — Apply ASAP!\n");
            body.append("─────────────────────────────────────────\n");
            for (int i = 0; i < expiringSoon.size(); i++) {
                Notification job = expiringSoon.get(i);
                LocalDate deadline = parseDeadline(job.getDeadline());
                long daysLeft = deadline != null
                        ? java.time.temporal.ChronoUnit.DAYS.between(today, deadline)
                        : -1;

                body.append(i + 1).append(". ").append(job.getCompanyName());
                if (job.getRole() != null && !job.getRole().isEmpty()) {
                    body.append(" — ").append(job.getRole());
                }
                body.append("\n");

                if (daysLeft == 0) {
                    body.append("   DEADLINE TODAY!\n");
                } else if (daysLeft == 1) {
                    body.append("   Deadline tomorrow\n");
                } else if (daysLeft > 0) {
                    body.append("   Deadline in ").append(daysLeft).append(" days (")
                        .append(deadline.format(DateTimeFormatter.ofPattern("MMM dd")))
                        .append(")\n");
                }

                if (job.getJobLink() != null && !job.getJobLink().isEmpty()) {
                    body.append("   🔗 Apply: ").append(job.getJobLink()).append("\n");
                }
                body.append("\n");
            }
        }

        // Other pending jobs summary
        if (!otherPending.isEmpty()) {
            body.append("Other pending applications: ").append(otherPending.size()).append("\n");
            body.append("─────────────────────────────────────────\n");
            int limit = Math.min(otherPending.size(), 10);
            for (int i = 0; i < limit; i++) {
                Notification job = otherPending.get(i);
                body.append("• ").append(job.getCompanyName());
                if (job.getRole() != null && !job.getRole().isEmpty()) {
                    body.append(" — ").append(job.getRole());
                }
                if (job.getDeadline() != null && !job.getDeadline().isEmpty()) {
                    body.append(" (deadline: ").append(job.getDeadline()).append(")");
                }
                body.append("\n");
            }
            if (otherPending.size() > 10) {
                body.append("... and ").append(otherPending.size() - 10).append(" more\n");
            }
            body.append("\n");
        }

        body.append("────────────────────────────────────────────\n");
        body.append("View all your jobs: ").append(frontendUrl).append("/dashboard\n\n");
        body.append("Don't let these opportunities slip away — apply today!\n\n");
        body.append("Best regards,\n");
        body.append("JobKick Team");

        return body.toString();
    }

    private LocalDate parseDeadline(String deadline) {
        if (deadline == null || deadline.trim().isEmpty()) {
            return null;
        }
        try {
            return LocalDate.parse(deadline.trim(), DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        } catch (DateTimeParseException e) {
            return null;
        }
    }

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
