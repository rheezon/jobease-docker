package com.jobnotifer.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "scheduler_state")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SchedulerState {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String schedulerName;
    
    @Column(nullable = false)
    private Integer currentRun = 0;
    
    @Column(nullable = false)
    private LocalDateTime lastRunTimestamp;
    
    @Column(nullable = false)
    private Boolean enabled = true;
}

