package com.jobnotifer.service;

import com.jobnotifer.entity.Notifier;
import com.jobnotifer.entity.SchedulerState;
import com.jobnotifer.entity.User;
import com.jobnotifer.repository.NotifierRepository;
import com.jobnotifer.repository.SchedulerStateRepository;
import com.jobnotifer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserEngagementService {

    private final UserRepository userRepository;
    private final NotifierRepository notifierRepository;
    private final SchedulerStateRepository schedulerStateRepository;
    private final EmailService emailService;

    @Value("${scheduler.engagement.enabled:true}")
    private boolean schedulerEnabled;

    @Value("${notifier.max-per-user}")
    private int maxNotifiersPerUser;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    private static final String SCHEDULER_NAME = "USER_ENGAGEMENT";

    @Scheduled(cron = "${scheduler.engagement.cron:0 0 10 * * ?}")
    @Transactional
    public void sendEngagementEmails() {
        if (!schedulerEnabled) {
            log.info("User engagement scheduler is disabled via config");
            return;
        }

        SchedulerState schedulerState = getOrCreateSchedulerState();

        if (!schedulerState.getEnabled()) {
            log.info("User engagement scheduler is disabled in database");
            return;
        }

        LocalDateTime currentTime = LocalDateTime.now();
        log.info("Starting user engagement email run {}", schedulerState.getCurrentRun() + 1);

        List<User> allUsers = userRepository.findAll();
        int emailsSent = 0;

        for (User user : allUsers) {
            try {
                List<Notifier> notifiers = notifierRepository.findByUserId(user.getId());
                int totalNotifiers = notifiers.size();
                long draftCount = notifiers.stream().filter(n -> n.getIsDraft() != null && n.getIsDraft()).count();
                long activeCount = totalNotifiers - draftCount;
                boolean atMax = totalNotifiers >= maxNotifiersPerUser;
                boolean hasDrafts = draftCount > 0;

                log.info("Engagement check for user {}: total={}, active={}, drafts={}, atMax={}",
                        user.getEmail(), totalNotifiers, activeCount, draftCount, atMax);

                if (hasDrafts && !atMax) {
                    sendDraftReminderEmail(user);
                    emailsSent++;
                } else if (activeCount == 0 && draftCount == 0) {
                    sendFirstNotifierEmail(user);
                    emailsSent++;
                } else if (!atMax && !hasDrafts) {
                    sendCreateMoreEmail(user);
                    emailsSent++;
                }
            } catch (Exception e) {
                log.error("Failed to send engagement email to {}", user.getEmail(), e);
            }
        }

        schedulerState.setCurrentRun(schedulerState.getCurrentRun() + 1);
        schedulerState.setLastRunTimestamp(currentTime);
        schedulerStateRepository.save(schedulerState);

        log.info("User engagement run completed. Sent {} emails", emailsSent);
    }

    private void sendFirstNotifierEmail(User user) {
        String subject = "🚀 Get started with JobKick — Create your first notifier";
        String body = "Hello " + user.getFullName() + ",\n\n"
                + "Welcome to JobKick! You're just one step away from automating your job search.\n\n"
                + "Create your first notifier to start receiving personalized job matches delivered straight to your inbox.\n\n"
                + "👉 " + frontendUrl + "/create-notifier\n\n"
                + "It only takes a minute to set up — pick your role, skills, and preferences, and we'll do the rest.\n\n"
                + "Best regards,\n"
                + "JobKick Team";

        emailService.sendEmail(user.getEmail(), subject, body);
        log.info("Sent first-notifier engagement email to {}", user.getEmail());
    }

    private void sendCreateMoreEmail(User user) {
        String subject = "💡 Expand your job search with more notifiers";
        String body = "Hello " + user.getFullName() + ",\n\n"
                + "You're doing great with JobKick! Did you know you can create additional notifiers to track different roles or locations?\n\n"
                + "More notifiers means more opportunities — cover all your interests and never miss a relevant opening.\n\n"
                + "👉 " + frontendUrl + "/create-notifier\n\n"
                + "Best regards,\n"
                + "JobKick Team";

        emailService.sendEmail(user.getEmail(), subject, body);
        log.info("Sent create-more engagement email to {}", user.getEmail());
    }

    private void sendDraftReminderEmail(User user) {
        String subject = "📝 You have an unfinished notifier — complete it today";
        String body = "Hello " + user.getFullName() + ",\n\n"
                + "You started setting up a notifier but didn't finish. Complete it now so you can start receiving job matches right away.\n\n"
                + "👉 " + frontendUrl + "/dashboard\n\n"
                + "It only takes a moment to finalize — don't let opportunities pass by!\n\n"
                + "Best regards,\n"
                + "JobKick Team";

        emailService.sendEmail(user.getEmail(), subject, body);
        log.info("Sent draft-reminder engagement email to {}", user.getEmail());
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
