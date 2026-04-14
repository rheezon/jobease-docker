package com.jobnotifer.controller;

import com.jobnotifer.dto.ApiResponse;
import com.jobnotifer.dto.UserInfoRequest;
import com.jobnotifer.dto.UserInfoResponse;
import com.jobnotifer.security.UserPrincipal;
import com.jobnotifer.service.UserInfoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/user-info")
@RequiredArgsConstructor
public class UserInfoController {
    
    private final UserInfoService userInfoService;
    
    /**
     * Add new user info record
     */
    @PostMapping
    public ResponseEntity<UserInfoResponse> addUserInfo(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody UserInfoRequest request) {
        UserInfoResponse response = userInfoService.addUserInfo(
                currentUser.getId(), request);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Get all user info records for the authenticated user
     */
    @GetMapping
    public ResponseEntity<List<UserInfoResponse>> getUserInfo(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        List<UserInfoResponse> userInfoList = userInfoService.getUserInfo(
                currentUser.getId());
        return ResponseEntity.ok(userInfoList);
    }
    
    /**
     * Get a specific user info record by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<UserInfoResponse> getUserInfoById(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id) {
        UserInfoResponse response = userInfoService.getUserInfoById(
                currentUser.getId(), id);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Update an existing user info record
     */
    @PutMapping("/{id}")
    public ResponseEntity<UserInfoResponse> updateUserInfo(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @Valid @RequestBody UserInfoRequest request) {
        UserInfoResponse response = userInfoService.updateUserInfo(
                currentUser.getId(), id, request);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Delete a user info record
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse> deleteUserInfo(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id) {
        userInfoService.deleteUserInfo(currentUser.getId(), id);
        return ResponseEntity.ok(new ApiResponse(true, "User info record deleted successfully"));
    }
}

