package com.jobnotifer.repository;

import com.jobnotifer.entity.SchedulerState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SchedulerStateRepository extends JpaRepository<SchedulerState, Long> {
    Optional<SchedulerState> findBySchedulerName(String schedulerName);
}

