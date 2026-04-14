package com.jobnotifer.controller;

import com.jobnotifer.dto.ApiResponse;
import com.jobnotifer.dto.NotifierRequest;
import com.jobnotifer.dto.NotifierResponse;
import com.jobnotifer.dto.ResumeUpdateRequest;
import com.jobnotifer.security.UserPrincipal;
import com.jobnotifer.service.NotifierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifiers")
@RequiredArgsConstructor
public class NotifierController {
    
    private final NotifierService notifierService;
    
    @PostMapping
    public ResponseEntity<NotifierResponse> createNotifier(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody NotifierRequest request) {
        NotifierResponse response = notifierService.createNotifier(currentUser.getId(), request);
        return ResponseEntity.ok(response);
    }
    
    @GetMapping
    public ResponseEntity<List<NotifierResponse>> getAllNotifiers(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        List<NotifierResponse> notifiers = notifierService.getUserNotifiers(currentUser.getId());
        return ResponseEntity.ok(notifiers);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<NotifierResponse> getNotifier(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id) {
        NotifierResponse response = notifierService.getNotifier(currentUser.getId(), id);
        return ResponseEntity.ok(response);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<NotifierResponse> updateNotifier(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @Valid @RequestBody NotifierRequest request) {
        NotifierResponse response = notifierService.updateNotifier(currentUser.getId(), id, request);
        return ResponseEntity.ok(response);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse> deleteNotifier(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id) {
        notifierService.deleteNotifier(currentUser.getId(), id);
        return ResponseEntity.ok(new ApiResponse(true, "Notifier deleted successfully"));
    }
    
    @GetMapping("/limit-info")
    public ResponseEntity<java.util.Map<String, Object>> getNotifierLimitInfo(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        java.util.Map<String, Object> limitInfo = notifierService.getNotifierLimitInfo(currentUser.getId());
        return ResponseEntity.ok(limitInfo);
    }
    
    @PatchMapping("/{id}/toggle-active")
    public ResponseEntity<NotifierResponse> toggleNotifierActive(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id) {
        NotifierResponse response = notifierService.toggleNotifierActive(currentUser.getId(), id);
        return ResponseEntity.ok(response);
    }
    
    @PatchMapping("/{id}/resume")
    public ResponseEntity<NotifierResponse> updateNotifierResume(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @Valid @RequestBody ResumeUpdateRequest request) {
        NotifierResponse response = notifierService.updateNotifierResume(
                currentUser.getId(), id, request.getResumeLatex());
        return ResponseEntity.ok(response);
    }
}

