package com.jobnotifer.repository;

import com.jobnotifer.entity.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface JobRepository extends JpaRepository<Job, Long> {
    List<Job> findByProcessedFalseAndTimestampBetween(LocalDateTime start, LocalDateTime end);
    
    @Query("SELECT j FROM Job j WHERE j.processed = false AND j.timestamp >= :start AND j.timestamp <= :end ORDER BY j.timestamp ASC")
    List<Job> findUnprocessedJobsInTimeWindow(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT j FROM Job j WHERE j.processed = true ORDER BY j.timestamp DESC")
    List<Job> findRecentProcessedJobs(org.springframework.data.domain.Pageable pageable);
}

