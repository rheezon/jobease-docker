package com.jobnotifer.dto;

import com.jobnotifer.entity.UserInfo;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserInfoResponse {
    
    private Long id;
    private Long userId;
    private String degreeName;
    private String collegeType;
    private Integer batchPassout;
    private String major;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public static UserInfoResponse fromEntity(UserInfo userInfo) {
        UserInfoResponse response = new UserInfoResponse();
        response.setId(userInfo.getId());
        response.setUserId(userInfo.getUser().getId());
        response.setDegreeName(userInfo.getDegreeName());
        response.setCollegeType(userInfo.getCollegeType());
        response.setBatchPassout(userInfo.getBatchPassout());
        response.setMajor(userInfo.getMajor());
        response.setCreatedAt(userInfo.getCreatedAt());
        response.setUpdatedAt(userInfo.getUpdatedAt());
        return response;
    }
}

