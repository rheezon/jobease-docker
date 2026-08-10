package com.jobnotifer.repository;

import com.jobnotifer.entity.HrContact;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface HrContactRepository extends JpaRepository<HrContact, Long> {
    Optional<HrContact> findByJobId(Long jobId);
}
