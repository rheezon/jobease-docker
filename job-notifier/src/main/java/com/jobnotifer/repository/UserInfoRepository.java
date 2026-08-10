package com.jobnotifer.repository;

import com.jobnotifer.entity.UserInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserInfoRepository extends JpaRepository<UserInfo, Long> {
    
    List<UserInfo> findByUserIdOrderByBatchPassoutDesc(Long userId);
    
    Optional<UserInfo> findByIdAndUserId(Long id, Long userId);
    
    void deleteByIdAndUserId(Long id, Long userId);
    
    void deleteByUserId(Long userId);
}

