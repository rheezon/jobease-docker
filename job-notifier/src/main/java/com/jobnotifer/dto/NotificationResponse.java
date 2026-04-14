package com.jobnotifer.dto;

import com.jobnotifer.entity.Notification;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class NotificationResponse {
    private Long id;
    private Long notifierId;
    private LocalDateTime timestamp;
    private Integer schedulerRun;
    private String resumeLink;
    private String resumeLatex;
    private String jobLink;
    private String companyName;
    private String role;
    private String experience;
    private String location;
    private String salary;
    private String batch;
    private String jobType;
    private String deadline;
    private String duration;
    private String jobDescription;
    private Double relevanceScore;
    private String relevanceReason;
    private String originalJobPosting;
    private LocalDateTime createdAt;
    private Boolean applied;
    
    public static NotificationResponse fromEntity(Notification notification) {
        NotificationResponse response = new NotificationResponse();
        response.setId(notification.getId());
        response.setNotifierId(notification.getNotifier().getId());
        response.setTimestamp(notification.getTimestamp());
        response.setSchedulerRun(notification.getSchedulerRun());
        response.setResumeLink(notification.getResumeLink());
        response.setResumeLatex(notification.getResumeLatex());
        response.setJobLink(notification.getJobLink());
        response.setCompanyName(notification.getCompanyName());
        response.setRole(notification.getRole());
        response.setExperience(notification.getExperience());
        response.setLocation(notification.getLocation());
        response.setSalary(notification.getSalary());
        response.setBatch(notification.getBatch());
        response.setJobType(notification.getJobType());
        response.setDeadline(notification.getDeadline());
        response.setDuration(notification.getDuration());
        response.setJobDescription(notification.getJobDescription());
        response.setRelevanceScore(notification.getRelevanceScore());
        response.setRelevanceReason(notification.getRelevanceReason());
        response.setOriginalJobPosting(notification.getOriginalJobPosting());
        response.setCreatedAt(notification.getCreatedAt());
        response.setApplied(notification.getApplied());
        return response;
    }
}

