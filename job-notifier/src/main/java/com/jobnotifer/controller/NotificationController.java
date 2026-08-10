package com.jobnotifer.controller;

import com.jobnotifer.dto.InterviewChatRequest;
import com.jobnotifer.dto.InterviewChatResponse;
import com.jobnotifer.dto.NotificationResponse;
import com.jobnotifer.dto.ResumeUpdateRequest;
import com.jobnotifer.security.UserPrincipal;
import com.jobnotifer.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {
    
    private final NotificationService notificationService;
    
    @GetMapping("/notifier/{notifierId}")
    public ResponseEntity<List<NotificationResponse>> getNotifications(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long notifierId) {
        List<NotificationResponse> notifications = notificationService.getNotifications(
                currentUser.getId(), notifierId);
        return ResponseEntity.ok(notifications);
    }
    
    @PutMapping("/{id}/applied")
    public ResponseEntity<NotificationResponse> markAsApplied(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id) {
        NotificationResponse response = notificationService.markAsApplied(currentUser.getId(), id);
        return ResponseEntity.ok(response);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id) {
        notificationService.deleteNotification(currentUser.getId(), id);
        return ResponseEntity.noContent().build();
    }
    
    @PatchMapping("/{id}/resume")
    public ResponseEntity<NotificationResponse> updateNotificationResume(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @Valid @RequestBody ResumeUpdateRequest request) {
        NotificationResponse response = notificationService.updateNotificationResume(
                currentUser.getId(), id, request.getResumeLatex());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/interview-chat")
    public ResponseEntity<InterviewChatResponse> interviewChat(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @Valid @RequestBody InterviewChatRequest request) {

        List<Map<String, String>> history = null;
        if (request.getConversationHistory() != null) {
            history = request.getConversationHistory().stream()
                    .map(msg -> {
                        Map<String, String> map = new HashMap<>();
                        map.put("role", msg.getRole());
                        map.put("text", msg.getText());
                        return map;
                    })
                    .collect(Collectors.toList());
        }

        String reply = notificationService.interviewChat(
                currentUser.getId(), id, request.getMessage(), history);
        return ResponseEntity.ok(new InterviewChatResponse(reply));
    }
}

