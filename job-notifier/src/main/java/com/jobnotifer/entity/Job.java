package com.jobnotifer.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "jobs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Job {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private LocalDateTime timestamp;
    
    @Column(name = "job_timestamp")
    private LocalDateTime jobTimestamp;
    
    @Column(nullable = false, length = 5000)
    private String job;
    
    @Column(nullable = false)
    private Boolean processed = false;
    
    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = true)
    private Long hash_id;
    
    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}

