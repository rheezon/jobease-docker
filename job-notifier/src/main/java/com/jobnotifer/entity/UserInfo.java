package com.jobnotifer.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_info")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserInfo {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(name = "degree_name", nullable = false, length = 255)
    private String degreeName;
    
    @Column(name = "college_type", nullable = false, length = 50)
    private String collegeType; // Tier1, Tier2, Tier3, etc.
    
    @Column(name = "batch_passout", nullable = false)
    private Integer batchPassout; // Year of graduation
    
    @Column(name = "major", nullable = false, length = 255)
    private String major;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

