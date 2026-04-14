package com.jobnotifer.service;

import com.jobnotifer.exception.LatexCompilationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

@Service
@Slf4j
public class LatexCompilerService {
    
    @Value("${latex.compiler.url}")
    private String latexCompilerUrl;
    
    @Value("${latex.timeout}")
    private long timeout;
    
    private final WebClient webClient;
    
    public LatexCompilerService() {
        this.webClient = WebClient.builder()
            .codecs(configurer -> configurer
                .defaultCodecs()
                .maxInMemorySize(10 * 1024 * 1024)) 
            .build();
    }
    
    /**
     * Compile LaTeX content to PDF using LaTeX Online service
     * @param latexCode The complete LaTeX document content
     * @return PDF bytes
     * @throws LatexCompilationException if compilation fails
     */
    public byte[] compileToPdf(String latexCode) throws LatexCompilationException {
        if (latexCode == null || latexCode.trim().isEmpty()) {
            log.error("LaTeX content cannot be null or empty");
            throw new LatexCompilationException(
                "LaTeX content cannot be null or empty", 
                LatexCompilationException.ErrorType.INVALID_LATEX_SYNTAX
            );
        }
        
        if (!validateLatexContent(latexCode)) {
            log.warn("LaTeX content validation failed - missing required elements");
            throw new LatexCompilationException(
                "Invalid LaTeX structure. Must include \\documentclass, \\begin{document}, and \\end{document}", 
                LatexCompilationException.ErrorType.INVALID_LATEX_SYNTAX
            );
        }
        
        log.info("Compiling LaTeX document to PDF...");
        log.debug("LaTeX content length: {} characters", latexCode.length());
        
        byte[] pdfBytes = compileWithYToTechService(latexCode);
        
        if (pdfBytes != null && pdfBytes.length > 0) {
            log.info("LaTeX compiled successfully to PDF ({} bytes)", pdfBytes.length);
            return pdfBytes;
        }
        
        log.error("LaTeX compilation returned empty or null PDF");
        throw new LatexCompilationException(
            "LaTeX compilation produced empty result", 
            LatexCompilationException.ErrorType.UNKNOWN
        );
    }
    
    /**
     * Compile LaTeX content using YToTech service
     * @param latexContent LaTeX content to compile
     * @return PDF bytes
     * @throws LatexCompilationException if compilation fails
     */
    private byte[] compileWithYToTechService(String latexContent) throws LatexCompilationException {
        try {
            Map<String, Object> resource = Map.of(
                "main", true,
                "content", latexContent
            );
            Map<String, Object> jsonBody = Map.of(
                "compiler", "pdflatex",
                "resources", java.util.List.of(resource)
            );
            
            log.debug("Sending LaTeX compilation request to YToTech service: {}", latexCompilerUrl);
            
            byte[] responseBytes = webClient.post()
                .uri(latexCompilerUrl)
                .header("Content-Type", "application/json")
                .body(BodyInserters.fromValue(jsonBody))
                .retrieve()
                .bodyToMono(byte[].class)
                .timeout(Duration.ofSeconds(timeout / 1000))
                .block();
                
            if (!isValidPdf(responseBytes)) {
                String responseText = responseBytes != null ? 
                    new String(responseBytes, StandardCharsets.UTF_8) : "null";
                log.error("YToTech service returned non-PDF content. Response: {}", 
                        responseText.length() > 500 ? responseText.substring(0, 500) + "..." : responseText);
                
                // Check if response contains LaTeX error messages
                if (responseText.contains("error") || responseText.contains("Error") || 
                    responseText.contains("undefined") || responseText.contains("!")) {
                    throw new LatexCompilationException(
                        "LaTeX syntax error. Please check your LaTeX code for errors. Details: " + 
                        (responseText.length() > 200 ? responseText.substring(0, 200) : responseText),
                        LatexCompilationException.ErrorType.INVALID_LATEX_SYNTAX
                    );
                }
                
                throw new LatexCompilationException(
                    "LaTeX compilation service returned non-PDF content", 
                    LatexCompilationException.ErrorType.UNKNOWN
                );
            }
            
            return responseBytes;
            
        } catch (WebClientResponseException.BadRequest e) {
            // 400 Bad Request - usually means invalid LaTeX syntax
            String responseBody = e.getResponseBodyAsString();
            log.error("🚨 Bad Request (400) - Invalid LaTeX: {}", responseBody);
            throw new LatexCompilationException(
                "Invalid LaTeX syntax. The LaTeX code contains errors that prevent compilation. " +
                "Please verify your LaTeX structure and syntax.",
                LatexCompilationException.ErrorType.INVALID_LATEX_SYNTAX,
                e
            );
        } catch (WebClientResponseException e) {
            // Other HTTP errors
            log.error("🚨 YToTech service error: {} - {}", e.getStatusCode(), e.getMessage());
            throw new LatexCompilationException(
                "LaTeX compilation service error: " + e.getStatusCode(),
                LatexCompilationException.ErrorType.SERVICE_UNAVAILABLE,
                e
            );
        } catch (LatexCompilationException e) {
            // Re-throw our custom exception
            throw e;
        } catch (Exception e) {
            log.error("🚨 Unexpected error during LaTeX compilation: {}", e.getMessage(), e);
            if (e.getMessage() != null && e.getMessage().toLowerCase().contains("timeout")) {
                throw new LatexCompilationException(
                    "LaTeX compilation timed out. The document may be too complex.",
                    LatexCompilationException.ErrorType.TIMEOUT,
                    e
                );
            }
            throw new LatexCompilationException(
                "Unexpected error during LaTeX compilation: " + e.getMessage(),
                LatexCompilationException.ErrorType.UNKNOWN,
                e
            );
        }
    }
    
    /**
     * Validate that the response is a valid PDF file
     * @param bytes Response bytes to validate
     * @return true if the bytes represent a valid PDF file
     */
    private boolean isValidPdf(byte[] bytes) {
        if (bytes == null || bytes.length < 4) {
            return false;
        }
        
        String header = new String(bytes, 0, Math.min(4, bytes.length), StandardCharsets.ISO_8859_1);
        boolean isPdf = header.equals("%PDF");
        
        if (!isPdf) {
            String preview = new String(bytes, 0, Math.min(100, bytes.length), StandardCharsets.UTF_8);
            log.debug("Invalid PDF header. First 100 chars: {}", preview);
        } else {
            log.debug("Valid PDF detected. Size: {} bytes", bytes.length);
        }
        
        return isPdf;
    }
    
    /**
     * @param latexContent LaTeX document content to validate
     * @return true if content appears valid
     */
    private boolean validateLatexContent(String latexContent) {
        if (latexContent == null || latexContent.trim().isEmpty()) {
            return false;
        }
        
        boolean hasDocumentClass = latexContent.contains("\\documentclass");
        boolean hasBeginDocument = latexContent.contains("\\begin{document}");
        boolean hasEndDocument = latexContent.contains("\\end{document}");
        
        boolean isValid = hasDocumentClass && hasBeginDocument && hasEndDocument;
        
        if (!isValid) {
            log.warn("LaTeX validation failed - missing required elements:");
            log.warn("  - \\documentclass: {}", hasDocumentClass);
            log.warn("  - \\begin{{document}}: {}", hasBeginDocument);
            log.warn("  - \\end{{document}}: {}", hasEndDocument);
        }
        
        return isValid;
    }
    
    /**
     * Test connection to YToTech LaTeX service
     * @return true if the service is reachable
     */
    public boolean isLatexOnlineAvailable() {
        log.info("Testing YToTech LaTeX service availability...");
        
        String testLatex = "\\documentclass{article}\\begin{document}Test\\end{document}";
        
        try {
            log.debug("Testing YToTech service: {}", latexCompilerUrl);
            byte[] result = compileWithYToTechService(testLatex);
            if (result != null && result.length > 0) {
                log.info("YToTech LaTeX service is available");
                return true;
            }
        } catch (Exception e) {
            log.warn("YToTech LaTeX service test failed: {}", e.getMessage());
        }
        
        log.warn("YToTech LaTeX service is currently unavailable");
        return false;
    }
}
