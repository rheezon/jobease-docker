package com.jobnotifer.dto;

import com.jobnotifer.entity.Notifier;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class NotifierResponse {
    private Long id;
    private String name;
    private String role;
    private String city;
    private String salaryExpectation;
    private String companiesPreference;
    private String experience;
    private String noticePeriod;
    private String skills;
    private String resumeLatex;
    private String latexResumePdfUrl;
    private String additionalPreferences;
    private Boolean isDraft;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long unreadNotificationsCount;
    
    public static NotifierResponse fromEntity(Notifier notifier) {
        NotifierResponse response = new NotifierResponse();
        response.setId(notifier.getId());
        response.setName(notifier.getName());
        response.setRole(notifier.getRole());
        response.setCity(notifier.getCity());
        response.setSalaryExpectation(notifier.getSalaryExpectation());
        response.setCompaniesPreference(notifier.getCompaniesPreference());
        response.setExperience(notifier.getExperience());
        response.setNoticePeriod(notifier.getNoticePeriod());
        response.setSkills(notifier.getSkills());
        response.setResumeLatex(notifier.getResumeLatex());
        response.setLatexResumePdfUrl(notifier.getLatexResumePdfUrl());
        response.setAdditionalPreferences(notifier.getAdditionalPreferences());
        response.setIsDraft(notifier.getIsDraft());
        response.setIsActive(notifier.getIsActive());
        response.setCreatedAt(notifier.getCreatedAt());
        response.setUpdatedAt(notifier.getUpdatedAt());
        return response;
    }
}

