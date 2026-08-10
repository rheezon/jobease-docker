package com.jobnotifer.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "hr_contacts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HrContact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_id", nullable = false)
    private Long jobId;

    private String email;

    @Column(columnDefinition = "TEXT")
    private String applyLinks;

    @Column(length = 500)
    private String company;

    @Column(length = 500)
    private String role;

    @Column(columnDefinition = "TEXT")
    private String sourceUrl;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}
