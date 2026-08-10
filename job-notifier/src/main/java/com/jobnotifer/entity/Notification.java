package com.jobnotifer.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Notification {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "notifier_id", nullable = false)
    private Notifier notifier;
    
    @Column(nullable = false)
    private LocalDateTime timestamp;
    
    @Column(nullable = false)
    private Integer schedulerRun;
    
    @Column(length = 1000)
    private String resumeLink;
    
    @Column(length = 100000)
    private String resumeLatex;
    
    @Column(length = 1000)
    private String jobLink;
    
    @Column(nullable = false)
    private String companyName;
    
    private String role;
    
    private String experience;
    
    private String location;
    
    private String salary;
    
    private String batch;
    
    private String jobType;
    
    private String deadline;
    
    private String duration;
    
    @Column(length = 5000)
    private String jobDescription;
    
    @Column(nullable = false)
    private Double relevanceScore;
    
    @Column(length = 1000)
    private String relevanceReason;
    
    @Column(length = 5000)
    private String originalJobPosting;

    @Column(name = "job_id")
    private Long jobId;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(nullable = false)
    private Boolean applied = false;
}

