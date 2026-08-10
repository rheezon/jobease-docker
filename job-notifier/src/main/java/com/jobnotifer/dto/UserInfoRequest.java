package com.jobnotifer.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UserInfoRequest {
    
    @NotBlank(message = "Degree name is required")
    private String degreeName;
    
    @NotBlank(message = "College type is required")
    private String collegeType; // Tier1, Tier2, Tier3, etc.
    
    @NotNull(message = "Batch passout year is required")
    @Min(value = 1950, message = "Batch passout year must be after 1950")
    @Max(value = 2100, message = "Batch passout year must be before 2100")
    private Integer batchPassout;
    
    @NotBlank(message = "Major is required")
    private String major;
}

