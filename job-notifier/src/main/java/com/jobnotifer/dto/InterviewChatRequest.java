package com.jobnotifer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class InterviewChatRequest {

    @NotBlank(message = "Message is required")
    @Size(max = 5000, message = "Message must be less than 5000 characters")
    private String message;

    private List<ChatMessage> conversationHistory;

    @Data
    public static class ChatMessage {
        private String role; // "user" or "model"
        private String text;
    }
}
