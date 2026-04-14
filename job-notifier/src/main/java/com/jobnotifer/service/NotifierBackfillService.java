package com.jobnotifer.service;

import com.jobnotifer.entity.Job;
import com.jobnotifer.entity.Notification;
import com.jobnotifer.entity.Notifier;
import com.jobnotifer.entity.UserInfo;
import com.jobnotifer.repository.JobRepository;
import com.jobnotifer.repository.NotificationRepository;
import com.jobnotifer.repository.UserInfoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotifierBackfillService {

    private final JobRepository jobRepository;
    private final NotificationRepository notificationRepository;
    private final UserInfoRepository userInfoRepository;
    private final GeminiService geminiService;
    private final LatexCompilerService latexCompilerService;
    private final CloudinaryService cloudinaryService;

    @Value("${notifier.backfill.job-count:50}")
    private int backfillJobCount;

    @Value("${notifier.backfill.max-age-days:7}")
    private int backfillMaxAgeDays;

    @Value("${ai.relevance.threshold}")
    private double relevanceThreshold;

    /**
     * Async backfill: scores recent jobs against a newly created notifier.
     * Runs in the background so the user isn't blocked.
     */
    @Async
    public void backfillRecentJobs(Notifier notifier) {
        log.info("Starting backfill for notifier {} (user {}), checking last {} jobs (max age: {} days)",
                notifier.getId(), notifier.getUser().getEmail(), backfillJobCount, backfillMaxAgeDays);

        List<Job> recentJobs = jobRepository.findRecentProcessedJobs(PageRequest.of(0, backfillJobCount));

        // Filter out jobs older than max age
        LocalDate cutoff = LocalDate.now().minusDays(backfillMaxAgeDays);
        recentJobs = recentJobs.stream()
                .filter(job -> job.getTimestamp().toLocalDate().isAfter(cutoff) || job.getTimestamp().toLocalDate().isEqual(cutoff))
                .toList();

        if (recentJobs.isEmpty()) {
            log.info("No recent jobs found for backfill within last {} days", backfillMaxAgeDays);
            return;
        }

        log.info("Found {} jobs within last {} days for backfill", recentJobs.size(), backfillMaxAgeDays);

        String educationInfo = formatEducationInfo(notifier.getUser().getId());
        int matched = 0;
        int skippedExpired = 0;

        for (Job job : recentJobs) {
            try {
                Map<String, Object> result = geminiService.analyzeJobRelevance(job.getJob(), notifier, educationInfo);
                double score = (double) result.get("score");

                // Skip jobs with expired deadlines
                String deadline = (String) result.get("deadline");
                if (isDeadlineExpired(deadline)) {
                    skippedExpired++;
                    continue;
                }

                if (score >= relevanceThreshold) {
                    String resumeLink = null;
                    String modifiedLatex = null;

                    if (notifier.getResumeLatex() != null && !notifier.getResumeLatex().isEmpty()) {
                        modifiedLatex = geminiService.modifyResumeForJob(notifier.getResumeLatex(), job.getJob());
                        resumeLink = generateAndUploadResume(modifiedLatex, notifier.getId(), job.getId());
                    }

                    Notification notification = new Notification();
                    notification.setNotifier(notifier);
                    notification.setTimestamp(job.getTimestamp());
                    notification.setSchedulerRun(0);
                    notification.setResumeLink(resumeLink);
                    notification.setResumeLatex(modifiedLatex);
                    notification.setJobLink((String) result.get("jobLink"));
                    notification.setCompanyName((String) result.get("company"));
                    notification.setRole((String) result.get("role"));
                    notification.setExperience((String) result.get("experience"));
                    notification.setLocation((String) result.get("location"));
                    notification.setSalary((String) result.get("salary"));
                    notification.setBatch((String) result.get("batch"));
                    notification.setJobType((String) result.get("jobType"));
                    notification.setDeadline((String) result.get("deadline"));
                    notification.setDuration((String) result.get("duration"));
                    notification.setJobDescription((String) result.get("description"));
                    notification.setRelevanceScore(score);
                    notification.setRelevanceReason((String) result.get("reason"));
                    notification.setOriginalJobPosting(job.getJob());
                    notification.setApplied(false);

                    notificationRepository.save(notification);
                    matched++;
                    log.info("Backfill: matched job {} for notifier {} (score: {})",
                            job.getId(), notifier.getId(), score);
                }
            } catch (Exception e) {
                log.error("Backfill: error processing job {} for notifier {}", job.getId(), notifier.getId(), e);
            }
        }

        log.info("Backfill completed for notifier {}. Checked {} jobs, matched {}, skipped {} expired",
                notifier.getId(), recentJobs.size(), matched, skippedExpired);
    }

    private String generateAndUploadResume(String resumeLatex, Long notifierId, Long jobId) {
        try {
            byte[] pdfBytes = latexCompilerService.compileToPdf(resumeLatex);
            if (pdfBytes == null) return null;

            String fileName = String.format("resume_%s_%s_%s",
                    notifierId, jobId, UUID.randomUUID().toString().substring(0, 8));
            return cloudinaryService.uploadPdfFromBytes(pdfBytes, fileName);
        } catch (Exception e) {
            log.error("Backfill: error generating resume", e);
            return null;
        }
    }

    private boolean isDeadlineExpired(String deadline) {
        if (deadline == null || deadline.trim().isEmpty()) return false;
        try {
            LocalDate deadlineDate = LocalDate.parse(deadline.trim(), DateTimeFormatter.ofPattern("yyyy-MM-dd"));
            return deadlineDate.isBefore(LocalDate.now());
        } catch (DateTimeParseException e) {
            return false;
        }
    }

    private String formatEducationInfo(Long userId) {
        List<UserInfo> educationList = userInfoRepository.findByUserIdOrderByBatchPassoutDesc(userId);
        if (educationList.isEmpty()) return "No education information provided";

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < educationList.size(); i++) {
            UserInfo edu = educationList.get(i);
            if (i > 0) sb.append("; ");
            sb.append(edu.getDegreeName())
                    .append(" in ").append(edu.getMajor())
                    .append(" (").append(edu.getCollegeType())
                    .append(", Batch ").append(edu.getBatchPassout()).append(")");
        }
        return sb.toString();
    }
}
