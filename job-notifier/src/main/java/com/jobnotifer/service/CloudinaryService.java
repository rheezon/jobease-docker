package com.jobnotifer.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.util.Map;

@Service
@Slf4j
public class CloudinaryService {
    
    @Value("${cloudinary.cloud-name}")
    private String cloudName;
    
    @Value("${cloudinary.api-key}")
    private String apiKey;
    
    @Value("${cloudinary.api-secret}")
    private String apiSecret;
    
    private Cloudinary cloudinary;
    
    @PostConstruct
    public void init() {
        cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret
        ));
    }
    
    /**
     * Upload PDF from byte array directly without creating temporary file
     * @param pdfBytes PDF content as byte array
     * @param fileName Desired file name
     * @return Cloudinary URL or null if upload fails
     */
    public String uploadPdfFromBytes(byte[] pdfBytes, String fileName) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> uploadResult = cloudinary.uploader().upload(pdfBytes, ObjectUtils.asMap(
                    "resource_type", "raw",
                    "public_id", "resumes/" + fileName,
                    "format", "pdf"
            ));
            
            String url = (String) uploadResult.get("secure_url");
            log.info("PDF uploaded to Cloudinary from bytes: {} ({} bytes)", url, pdfBytes.length);
            return url;
            
        } catch (IOException e) {
            log.error("Error uploading PDF bytes to Cloudinary", e);
            return null;
        }
    }
    
    /**

    * Delete PDF by its public_id
     * @param publicId The Cloudinary public_id
     * @return true if deleted successfully, false otherwise
     */
    public boolean deletePdf(String publicId) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", "raw"));
            
            String resultStatus = (String) result.get("result");
            
            if ("ok".equals(resultStatus)) {
                log.info("PDF deleted successfully from Cloudinary: {}", publicId);
                return true;
            } else if ("not found".equals(resultStatus)) {
                // File doesn't exist - nothing to delete, so we can consider this successful
                log.info("PDF not found in Cloudinary (already deleted or never existed): {}", publicId);
                return true;
            } else {
                log.warn("PDF deletion returned unexpected status '{}' for publicId: {}. Full response: {}", 
                        resultStatus, publicId, result);
                return false;
            }
        } catch (IOException e) {
            log.error("Error deleting PDF from Cloudinary: {}", publicId, e);
            return false;
        }
    }
    
    /**
     * Delete PDF by its Cloudinary URL
     * @param pdfUrl Full Cloudinary URL
     * @return true if deleted successfully, false otherwise
     */
    public boolean deletePdfByUrl(String pdfUrl) {
        if (pdfUrl == null || pdfUrl.trim().isEmpty()) {
            log.warn("Cannot delete PDF: URL is null or empty");
            return false;
        }
        
        try {
            String publicId = extractPublicIdFromUrl(pdfUrl);
            if (publicId == null) {
                log.error("Could not extract public_id from URL: {}", pdfUrl);
                return false;
            }
            
            return deletePdf(publicId);
        } catch (Exception e) {
            log.error("Error deleting PDF by URL: {}", pdfUrl, e);
            return false;
        }
    }
    
    /**
     * Extract public_id from Cloudinary URL
     */
    private String extractPublicIdFromUrl(String url) {
        try {
            if (!url.contains("/upload/")) {
                return null;
            }
            
            String afterUpload = url.substring(url.indexOf("/upload/") + 8);
            
            if (afterUpload.startsWith("v")) {
                int slashIndex = afterUpload.indexOf("/");
                if (slashIndex > 0) {
                    afterUpload = afterUpload.substring(slashIndex + 1);
                }
            }
            
            String publicId = afterUpload.replaceFirst("\\.pdf$", "");
            log.debug("Extracted public_id '{}' from URL '{}'", publicId, url);
            return publicId;
            
        } catch (Exception e) {
            log.error("Error extracting public_id from URL: {}", url, e);
            return null;
        }
    }
}

