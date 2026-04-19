package com.jobnotifer.service;

import com.jobnotifer.entity.Job;
import com.jobnotifer.entity.Notification;
import com.jobnotifer.entity.Notifier;
import com.jobnotifer.entity.SchedulerState;
import com.jobnotifer.entity.UserInfo;
import com.jobnotifer.repository.JobRepository;
import com.jobnotifer.repository.NotificationRepository;
import com.jobnotifer.repository.NotifierRepository;
import com.jobnotifer.repository.SchedulerStateRepository;
import com.jobnotifer.repository.UserInfoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class JobProcessingService {
    
    private final JobRepository jobRepository;
    private final NotifierRepository notifierRepository;
    private final NotificationRepository notificationRepository;
    private final SchedulerStateRepository schedulerStateRepository;
    private final UserInfoRepository userInfoRepository;
    private final GeminiService geminiService;
    private final LatexCompilerService latexCompilerService;
    private final CloudinaryService cloudinaryService;
    private final EmailService emailService;
    
    @Value("${scheduler.enabled}")
    private boolean schedulerEnabled;
    
    @Value("${ai.relevance.threshold}")
    private double relevanceThreshold;
    
    @Value("${app.frontend.url}")
    private String frontendUrl;
    
    @Scheduled(fixedRateString = "${scheduler.fixed-rate}")
    @Transactional
    public void processJobs() {
        if (!schedulerEnabled) {
            log.debug("Scheduler is disabled");
            return;
        }
        
        SchedulerState schedulerState = getOrCreateSchedulerState();
        
        LocalDateTime currentTime = LocalDateTime.now();
        LocalDateTime startWindow = schedulerState.getLastRunTimestamp();
        LocalDateTime endWindow = currentTime;
        
        log.info("Starting scheduler run {}", schedulerState.getCurrentRun() + 1);
        log.info("Processing jobs from {} to {}", startWindow, endWindow);
        log.info("DEBUG: Start window = {}, End window = {}", startWindow, endWindow);
        
        // On first run (currentRun == 0), process ALL unprocessed jobs regardless of timestamp
        // This ensures jobs created before scheduler started are processed
        // For subsequent runs, process jobs in time window AND any old unprocessed jobs
        List<Job> jobs;
        if (schedulerState.getCurrentRun() == 0) {
            log.info("First scheduler run detected - processing ALL unprocessed jobs");
            jobs = jobRepository.findAll().stream()
                    .filter(j -> !j.getProcessed())
                    .toList();
        } else {
            // Get jobs in the time window
            List<Job> windowJobs = jobRepository.findUnprocessedJobsInTimeWindow(startWindow, endWindow);
            
            // Also get any old unprocessed jobs (jobs created before last run but still unprocessed)
            // This handles cases where jobs were created before scheduler started or were missed
            List<Job> oldUnprocessedJobs = jobRepository.findAll().stream()
                    .filter(j -> !j.getProcessed() && j.getTimestamp().isBefore(startWindow))
                    .toList();
            
            if (!oldUnprocessedJobs.isEmpty()) {
                log.info("Found {} old unprocessed jobs (created before last run), including them", oldUnprocessedJobs.size());
            }
            
            // Combine both lists, avoiding duplicates using Set
            Set<Job> uniqueJobs = new HashSet<>(windowJobs);
            uniqueJobs.addAll(oldUnprocessedJobs);
            jobs = new ArrayList<>(uniqueJobs);
        }
        log.info("Found {} unprocessed jobs to process", jobs.size());
        
        List<Job> allUnprocessed = jobRepository.findAll().stream()
            .filter(j -> !j.getProcessed())
            .toList();
        log.info("DEBUG: Total unprocessed jobs in DB: {}", allUnprocessed.size());
        for (Job j : allUnprocessed) {
            log.info("DEBUG: Job {} - timestamp: {}, processed: {}", j.getId(), j.getTimestamp(), j.getProcessed());
        }
        
        // Only process jobs for active notifiers
        List<Notifier> notifiers = notifierRepository.findAll().stream()
                .filter(Notifier::getIsActive)
                .toList();
        log.info("Processing jobs for {} active notifiers", notifiers.size());
        
        int processedJobsCount = 0;
        int totalAiCalls = 0;
        
        // Track new notifications per user
        Map<Long, Integer> userNotificationCount = new HashMap<>();
        
        for (Job job : jobs) {
            for (Notifier notifier : notifiers) {
                try {
                    boolean notificationCreated = processJobForNotifier(job, notifier, schedulerState.getCurrentRun() + 1);
                    totalAiCalls++;
                    
                    if (notificationCreated) {
                        Long userId = notifier.getUser().getId();
                        userNotificationCount.put(userId, userNotificationCount.getOrDefault(userId, 0) + 1);
                    }
                } catch (Exception e) {
                    log.error("Error processing job {} for notifier {}", job.getId(), notifier.getId(), e);
                }
            }
            
            job.setProcessed(true);
            jobRepository.save(job);
            processedJobsCount++;
        }
        
        schedulerState.setCurrentRun(schedulerState.getCurrentRun() + 1);
        schedulerState.setLastRunTimestamp(currentTime);
        schedulerStateRepository.save(schedulerState);
        
        // Send email notifications to users with new relevant jobs
        for (Map.Entry<Long, Integer> entry : userNotificationCount.entrySet()) {
            Long userId = entry.getKey();
            Integer notificationCount = entry.getValue();
            try {
                sendJobNotificationEmail(userId, notificationCount);
            } catch (Exception e) {
                log.error("Failed to send email notification to user {}", userId, e);
            }
        }
        
        log.info("Scheduler run completed. Processed {} jobs, found {} ai calls, sent {} email notifications", 
                processedJobsCount, totalAiCalls, userNotificationCount.size());
    }
    
    private boolean processJobForNotifier(Job job, Notifier notifier, int schedulerRun) {
        // Fetch and format user education information
        String educationInfo = formatEducationInfo(notifier.getUser().getId());
        
        Map<String, Object> analysisResult = geminiService.analyzeJobRelevance(job.getJob(), notifier, educationInfo);
        
        double relevanceScore = (double) analysisResult.get("score");
        String relevanceReason = (String) analysisResult.get("reason");
        
        log.debug("Job {} relevance for notifier {}: {}", job.getId(), notifier.getId(), relevanceScore);
        
        if (relevanceScore >= relevanceThreshold) {
            log.info("Job {} is relevant for notifier {} (score: {})", job.getId(), notifier.getId(), relevanceScore);
            
            String resumeLink = null;
            String modifiedResumeLatex = null;
            if (notifier.getResumeLatex() != null && !notifier.getResumeLatex().isEmpty()) {
                // Modify resume LaTeX using AI to align with job posting
                log.info("Modifying resume LaTeX for job {} using AI", job.getId());
                modifiedResumeLatex = geminiService.modifyResumeForJob(notifier.getResumeLatex(), job.getJob());
                
                // Generate PDF from modified LaTeX
                resumeLink = generateAndUploadResume(modifiedResumeLatex, notifier.getId(), job.getId());
            }
            
            String company = (String) analysisResult.get("company");
            String role = (String) analysisResult.get("role");
            String experience = (String) analysisResult.get("experience");
            String location = (String) analysisResult.get("location");
            String salary = (String) analysisResult.get("salary");
            String batch = (String) analysisResult.get("batch");
            String jobType = (String) analysisResult.get("jobType");
            String deadline = (String) analysisResult.get("deadline");
            String duration = (String) analysisResult.get("duration");
            String description = (String) analysisResult.get("description");
            String jobLink = (String) analysisResult.get("jobLink");
            
            Notification notification = new Notification();
            notification.setNotifier(notifier);
            notification.setTimestamp(job.getTimestamp());
            notification.setSchedulerRun(schedulerRun);
            notification.setResumeLink(resumeLink);
            notification.setResumeLatex(modifiedResumeLatex);
            notification.setJobLink(jobLink);
            notification.setCompanyName(company);
            notification.setRole(role);
            notification.setExperience(experience);
            notification.setLocation(location);
            notification.setSalary(salary);
            notification.setBatch(batch);
            notification.setJobType(jobType);
            notification.setDeadline(deadline);
            notification.setDuration(duration);
            notification.setJobDescription(description);
            notification.setRelevanceScore(relevanceScore);
            notification.setRelevanceReason(relevanceReason);
            notification.setOriginalJobPosting(job.getJob());
            notification.setJobId(job.getId());
            notification.setApplied(false);

            notificationRepository.save(notification);
            log.info("Notification created for notifier {} - Company: {}", notifier.getId(), company);
            return true;
        }
        return false;
    }
    
    private String generateAndUploadResume(String resumeLatex, Long notifierId, Long jobId) {
        try {
            byte[] pdfBytes = latexCompilerService.compileToPdf(resumeLatex);
            
            if (pdfBytes == null) {
                log.error("Failed to compile LaTeX for notifier {}", notifierId);
                return null;
            }
            
            String fileName = String.format("resume_%s_%s_%s", 
                    notifierId, 
                    jobId, 
                    UUID.randomUUID().toString().substring(0, 8));
            
            String url = cloudinaryService.uploadPdfFromBytes(pdfBytes, fileName);
            
            log.info("Resume compiled and uploaded successfully for notifier {} ({} bytes)", 
                    notifierId, pdfBytes.length);
            
            return url;
            
        } catch (Exception e) {
            log.error("Error generating and uploading resume", e);
            return null;
        }
    }
    
    private SchedulerState getOrCreateSchedulerState() {
        return schedulerStateRepository.findBySchedulerName("job-processor")
                .orElseGet(() -> {
                    SchedulerState state = new SchedulerState();
                    state.setSchedulerName("job-processor");
                    state.setCurrentRun(0);
                    // Set initial timestamp to 24 hours ago to catch existing jobs
                    state.setLastRunTimestamp(LocalDateTime.now().minusHours(24));
                    state.setEnabled(true);
                    return schedulerStateRepository.save(state);
                });
    }
    
    public void resetScheduler() {
        SchedulerState state = getOrCreateSchedulerState();
        state.setCurrentRun(0);
        state.setLastRunTimestamp(LocalDateTime.now());
        schedulerStateRepository.save(state);
        log.info("Scheduler state reset");
    }
    
    /**
     * Format user's education information for AI analysis
     */
    private String formatEducationInfo(Long userId) {
        List<UserInfo> educationList = userInfoRepository.findByUserIdOrderByBatchPassoutDesc(userId);
        
        if (educationList.isEmpty()) {
            return "No education information provided";
        }
        
        StringBuilder educationInfo = new StringBuilder();
        for (int i = 0; i < educationList.size(); i++) {
            UserInfo edu = educationList.get(i);
            if (i > 0) {
                educationInfo.append("; ");
            }
            educationInfo.append(edu.getDegreeName())
                    .append(" in ").append(edu.getMajor())
                    .append(" (").append(edu.getCollegeType())
                    .append(", Batch ").append(edu.getBatchPassout())
                    .append(")");
        }
        
        return educationInfo.toString();
    }
    
    /**
     * Send email notification to user about new relevant jobs
     */
    private void sendJobNotificationEmail(Long userId, int notificationCount) {
        try {
            // Find notifiers for this user to get user details
            List<Notifier> userNotifiers = notifierRepository.findByUserId(userId);
            if (userNotifiers.isEmpty()) {
                log.warn("No notifiers found for user {} to get email", userId);
                return;
            }
            
            String userEmail = userNotifiers.get(0).getUser().getEmail();
            String userName = userNotifiers.get(0).getUser().getFullName();
            
            String dashboardLink = frontendUrl + "/dashboard";
            
            String subject = notificationCount == 1 ? 
                    "New Job Match Found!" : 
                    String.format("%d New Job Matches Found!", notificationCount);
            
            String message = String.format(
                    "Hi %s,\n\n" +
                    "Great news! We found %s relevant %s matching your preferences.\n\n" +
                    "These jobs have been carefully analyzed and matched to your profile. " +
                    "Don't miss out on these opportunities!\n\n" +
                    "Visit your dashboard to view the details and apply:\n%s\n\n" +
                    "Best regards,\n" +
                    "JobKick Team",
                    userName != null ? userName : "there",
                    notificationCount,
                    notificationCount == 1 ? "job" : "jobs",
                    dashboardLink
            );
            
            emailService.sendEmail(userEmail, subject, message);
            log.info("Email notification sent to user {} ({}) about {} new job(s)", userId, userEmail, notificationCount);
            
        } catch (Exception e) {
            log.error("Failed to send job notification email to user {}. Job processing will continue.", userId, e);
            // Don't throw - email failure shouldn't affect job processing
        }
    }
}

