package com.jobnotifer.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "notifiers")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Notifier {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(nullable = false)
    private String name;
    
    private String role;
    
    private String city;
    
    private String salaryExpectation;
    
    @Column(length = 1000)
    private String companiesPreference;
    
    private String experience;
    
    private String noticePeriod;
    
    @Column(length = 2000)
    private String skills;
    
    @Column(length = 100000)
    private String resumeLatex;
    
    @Column(length = 1000)
    private String latexResumePdfUrl;
    
    @Column(length = 10000)
    private String additionalPreferences;
    
    @Column(nullable = false)
    private Boolean isDraft = false;
    
    @Column(nullable = false)
    private Boolean isActive = false;
    
    @OneToMany(mappedBy = "notifier", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Notification> notifications = new ArrayList<>();
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}

