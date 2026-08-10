package com.jobnotifer.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String type = "Bearer";
    private Long userId;
    private String email;
    private String fullName;
    
    public AuthResponse(String token, Long userId, String email, String fullName) {
        this.token = token;
        this.userId = userId;
        this.email = email;
        this.fullName = fullName;
    }
}

