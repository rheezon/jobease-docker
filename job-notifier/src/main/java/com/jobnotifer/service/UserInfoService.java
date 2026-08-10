package com.jobnotifer.service;

import com.jobnotifer.dto.UserInfoRequest;
import com.jobnotifer.dto.UserInfoResponse;
import com.jobnotifer.entity.User;
import com.jobnotifer.entity.UserInfo;
import com.jobnotifer.repository.UserInfoRepository;
import com.jobnotifer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserInfoService {
    
    private final UserInfoRepository userInfoRepository;
    private final UserRepository userRepository;
    
    /**
     * Add new user info record
     * @param userId User ID
     * @param request User info details
     * @return Created user info record
     */
    @Transactional
    public UserInfoResponse addUserInfo(Long userId, UserInfoRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        UserInfo userInfo = new UserInfo();
        userInfo.setUser(user);
        userInfo.setDegreeName(request.getDegreeName());
        userInfo.setCollegeType(request.getCollegeType());
        userInfo.setBatchPassout(request.getBatchPassout());
        userInfo.setMajor(request.getMajor());
        
        UserInfo saved = userInfoRepository.save(userInfo);
        
        log.info("User info record added for user: {}, degree: {}", userId, request.getDegreeName());
        
        return UserInfoResponse.fromEntity(saved);
    }
    
    /**
     * Get all user info records
     * @param userId User ID
     * @return List of user info records
     */
    @Transactional(readOnly = true)
    public List<UserInfoResponse> getUserInfo(Long userId) {
        List<UserInfo> userInfoList = userInfoRepository
                .findByUserIdOrderByBatchPassoutDesc(userId);
        
        return userInfoList.stream()
                .map(UserInfoResponse::fromEntity)
                .collect(Collectors.toList());
    }
    
    /**
     * Get a specific user info record
     * @param userId User ID
     * @param infoId User info ID
     * @return User info record
     */
    @Transactional(readOnly = true)
    public UserInfoResponse getUserInfoById(Long userId, Long infoId) {
        UserInfo userInfo = userInfoRepository.findByIdAndUserId(infoId, userId)
                .orElseThrow(() -> new RuntimeException("User info record not found"));
        
        return UserInfoResponse.fromEntity(userInfo);
    }
    
    /**
     * Update an existing user info record
     * @param userId User ID
     * @param infoId User info ID
     * @param request Updated user info details
     * @return Updated user info record
     */
    @Transactional
    public UserInfoResponse updateUserInfo(Long userId, Long infoId, UserInfoRequest request) {
        UserInfo userInfo = userInfoRepository.findByIdAndUserId(infoId, userId)
                .orElseThrow(() -> new RuntimeException("User info record not found or unauthorized access"));
        
        userInfo.setDegreeName(request.getDegreeName());
        userInfo.setCollegeType(request.getCollegeType());
        userInfo.setBatchPassout(request.getBatchPassout());
        userInfo.setMajor(request.getMajor());
        
        UserInfo updated = userInfoRepository.save(userInfo);
        
        log.info("User info record updated: {} for user: {}", infoId, userId);
        
        return UserInfoResponse.fromEntity(updated);
    }
    
    /**
     * Delete a user info record
     * @param userId User ID
     * @param infoId User info ID
     */
    @Transactional
    public void deleteUserInfo(Long userId, Long infoId) {
        UserInfo userInfo = userInfoRepository.findByIdAndUserId(infoId, userId)
                .orElseThrow(() -> new RuntimeException("User info record not found or unauthorized access"));
        
        userInfoRepository.delete(userInfo);
        
        log.info("User info record deleted: {} for user: {}", infoId, userId);
    }
}

