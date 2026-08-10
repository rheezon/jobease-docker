package com.jobnotifer.dto;

import lombok.Data;

@Data
public class InterviewChatResponse {
    private String reply;

    public InterviewChatResponse(String reply) {
        this.reply = reply;
    }
}
