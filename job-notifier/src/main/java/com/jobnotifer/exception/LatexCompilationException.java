package com.jobnotifer.exception;

public class LatexCompilationException extends RuntimeException {
    
    private final ErrorType errorType;
    
    public enum ErrorType {
        INVALID_LATEX_SYNTAX,
        SERVICE_UNAVAILABLE,
        TIMEOUT,
        UNKNOWN
    }
    
    public LatexCompilationException(String message, ErrorType errorType) {
        super(message);
        this.errorType = errorType;
    }
    
    public LatexCompilationException(String message, ErrorType errorType, Throwable cause) {
        super(message, cause);
        this.errorType = errorType;
    }
    
    public ErrorType getErrorType() {
        return errorType;
    }
}

