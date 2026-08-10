package com.jobnotifer.repository;

import com.jobnotifer.entity.Notifier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotifierRepository extends JpaRepository<Notifier, Long> {
    List<Notifier> findByUserId(Long userId);
    
    List<Notifier> findByUserIdAndIsActiveTrue(Long userId);
    
    long countByUserId(Long userId);
    
    long countByUserIdAndIsActiveTrue(Long userId);
}

