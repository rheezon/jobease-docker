package com.jobnotifer.controller;

import com.jobnotifer.dto.ApiResponse;
import com.jobnotifer.security.UserPrincipal;
import com.jobnotifer.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    
    private final UserService userService;
    
    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse> deleteMyAccount(@AuthenticationPrincipal UserPrincipal currentUser) {
        userService.deleteAccount(currentUser.getId());
        return ResponseEntity.ok(new ApiResponse(true, "Account deleted successfully"));
    }
}

