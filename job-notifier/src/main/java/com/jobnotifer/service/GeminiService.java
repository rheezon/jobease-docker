package com.jobnotifer.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobnotifer.entity.Notifier;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.model}")
    private String model;

    @Value("${groq.api.key:}")
    private String groqApiKey;

    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String groqModel;

    @Value("${openrouter.enabled:false}")
    private boolean openRouterEnabled;

    @Value("${openrouter.api.key:}")
    private String openRouterApiKey;

    @Value("${openrouter.model:google/gemini-2.5-flash}")
    private String openRouterModel;

    @Value("${openrouter.base-url:https://openrouter.ai/api}")
    private String openRouterBaseUrl;

    @Value("${ai.prompt.template}")
    private String promptTemplate;

    @Value("${ai.resume.modification.prompt}")
    private String resumeModificationPrompt;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final WebClient geminiWebClient;
    private final WebClient groqWebClient;

    public GeminiService() {
        this.geminiWebClient = WebClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com")
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
        this.groqWebClient = WebClient.builder()
                .baseUrl("https://api.groq.com/openai")
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    private WebClient getOpenRouterClient() {
        return WebClient.builder()
                .baseUrl(openRouterBaseUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    private boolean isGroqEnabled() {
        return groqApiKey != null && !groqApiKey.isEmpty();
    }

    // ==================== OpenRouter API Calls ====================

    private String callOpenRouter(String prompt, double temperature, int maxTokens) throws Exception {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", openRouterModel);
        requestBody.put("temperature", temperature);
        requestBody.put("max_tokens", maxTokens);

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "user", "content", prompt));
        requestBody.put("messages", messages);

        log.info("Calling OpenRouter API with model: {}", openRouterModel);

        String response = getOpenRouterClient().post()
                .uri("/v1/chat/completions")
                .header("Authorization", "Bearer " + openRouterApiKey)
                .bodyValue(requestBody)
                .retrieve()
                .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                    clientResponse -> {
                        log.error("OpenRouter API error: Status {}", clientResponse.statusCode());
                        return clientResponse.bodyToMono(String.class)
                            .doOnNext(body -> log.error("OpenRouter API error response body: {}", body))
                            .then(Mono.error(new RuntimeException("OpenRouter API returned error: " + clientResponse.statusCode())));
                    })
                .bodyToMono(String.class)
                .block();

        JsonNode responseNode = objectMapper.readTree(response);
        return responseNode
                .path("choices").get(0)
                .path("message")
                .path("content").asText();
    }

    private String callOpenRouterMultiTurn(List<Map<String, String>> messages, double temperature, int maxTokens) throws Exception {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", openRouterModel);
        requestBody.put("temperature", temperature);
        requestBody.put("max_tokens", maxTokens);
        requestBody.put("messages", messages);

        log.info("Calling OpenRouter API for multi-turn chat with model: {}", openRouterModel);

        String response = getOpenRouterClient().post()
                .uri("/v1/chat/completions")
                .header("Authorization", "Bearer " + openRouterApiKey)
                .bodyValue(requestBody)
                .retrieve()
                .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                    clientResponse -> {
                        log.error("OpenRouter API error: Status {}", clientResponse.statusCode());
                        return clientResponse.bodyToMono(String.class)
                            .doOnNext(body -> log.error("OpenRouter API error response body: {}", body))
                            .then(Mono.error(new RuntimeException("OpenRouter API returned error: " + clientResponse.statusCode())));
                    })
                .bodyToMono(String.class)
                .block();

        JsonNode responseNode = objectMapper.readTree(response);
        return responseNode
                .path("choices").get(0)
                .path("message")
                .path("content").asText();
    }

    // ==================== Gemini API Calls ====================

    private String callGemini(String prompt, double temperature, int maxTokens) throws Exception {
        Map<String, Object> requestBody = new HashMap<>();
        Map<String, Object> content = new HashMap<>();
        Map<String, String> part = new HashMap<>();
        part.put("text", prompt);
        content.put("parts", List.of(part));
        requestBody.put("contents", List.of(content));

        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("temperature", temperature);
        generationConfig.put("maxOutputTokens", maxTokens);
        requestBody.put("generationConfig", generationConfig);

        log.debug("Calling Gemini API with model: {}", model);

        String response = geminiWebClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/v1/models/" + model + ":generateContent")
                        .queryParam("key", apiKey)
                        .build())
                .bodyValue(requestBody)
                .retrieve()
                .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                    clientResponse -> {
                        log.error("Gemini API error: Status {}", clientResponse.statusCode());
                        return clientResponse.bodyToMono(String.class)
                            .doOnNext(body -> log.error("Gemini API error response body: {}", body))
                            .then(Mono.error(new RuntimeException("Gemini API returned error: " + clientResponse.statusCode())));
                    })
                .bodyToMono(String.class)
                .block();

        JsonNode responseNode = objectMapper.readTree(response);
        return responseNode
                .path("candidates").get(0)
                .path("content")
                .path("parts").get(0)
                .path("text").asText();
    }

    private String callGeminiMultiTurn(List<Map<String, Object>> contents, double temperature, int maxTokens) throws Exception {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("contents", contents);

        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("temperature", temperature);
        generationConfig.put("maxOutputTokens", maxTokens);
        requestBody.put("generationConfig", generationConfig);

        log.debug("Calling Gemini API for multi-turn chat");

        String response = geminiWebClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/v1/models/" + model + ":generateContent")
                        .queryParam("key", apiKey)
                        .build())
                .bodyValue(requestBody)
                .retrieve()
                .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                    clientResponse -> {
                        log.error("Gemini API error: Status {}", clientResponse.statusCode());
                        return clientResponse.bodyToMono(String.class)
                            .doOnNext(body -> log.error("Gemini API error response body: {}", body))
                            .then(Mono.error(new RuntimeException("Gemini API returned error: " + clientResponse.statusCode())));
                    })
                .bodyToMono(String.class)
                .block();

        JsonNode responseNode = objectMapper.readTree(response);
        return responseNode
                .path("candidates").get(0)
                .path("content")
                .path("parts").get(0)
                .path("text").asText();
    }

    // ==================== Groq API Calls ====================

    private String callGroq(String prompt, double temperature, int maxTokens) throws Exception {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", groqModel);
        requestBody.put("temperature", temperature);
        requestBody.put("max_tokens", maxTokens);

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "user", "content", prompt));
        requestBody.put("messages", messages);

        log.info("Calling Groq API as fallback with model: {}", groqModel);

        String response = groqWebClient.post()
                .uri("/v1/chat/completions")
                .header("Authorization", "Bearer " + groqApiKey)
                .bodyValue(requestBody)
                .retrieve()
                .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                    clientResponse -> {
                        log.error("Groq API error: Status {}", clientResponse.statusCode());
                        return clientResponse.bodyToMono(String.class)
                            .doOnNext(body -> log.error("Groq API error response body: {}", body))
                            .then(Mono.error(new RuntimeException("Groq API returned error: " + clientResponse.statusCode())));
                    })
                .bodyToMono(String.class)
                .block();

        JsonNode responseNode = objectMapper.readTree(response);
        return responseNode
                .path("choices").get(0)
                .path("message")
                .path("content").asText();
    }

    private String callGroqMultiTurn(List<Map<String, String>> messages, double temperature, int maxTokens) throws Exception {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", groqModel);
        requestBody.put("temperature", temperature);
        requestBody.put("max_tokens", maxTokens);
        requestBody.put("messages", messages);

        log.info("Calling Groq API as fallback for multi-turn chat");

        String response = groqWebClient.post()
                .uri("/v1/chat/completions")
                .header("Authorization", "Bearer " + groqApiKey)
                .bodyValue(requestBody)
                .retrieve()
                .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                    clientResponse -> {
                        log.error("Groq API error: Status {}", clientResponse.statusCode());
                        return clientResponse.bodyToMono(String.class)
                            .doOnNext(body -> log.error("Groq API error response body: {}", body))
                            .then(Mono.error(new RuntimeException("Groq API returned error: " + clientResponse.statusCode())));
                    })
                .bodyToMono(String.class)
                .block();

        JsonNode responseNode = objectMapper.readTree(response);
        return responseNode
                .path("choices").get(0)
                .path("message")
                .path("content").asText();
    }

    // ==================== Unified call with fallback ====================

    /**
     * Flow:
     * 1. If openrouter.enabled=true → use OpenRouter as primary
     * 2. Else → use Gemini as primary, Groq as fallback
     */
    private String callAI(String prompt, double temperature, int maxTokens) throws Exception {
        if (openRouterEnabled) {
            try {
                return callOpenRouter(prompt, temperature, maxTokens);
            } catch (Exception e) {
                log.warn("OpenRouter failed, falling back to Gemini. Error: {}", e.getMessage());
                try {
                    return callGemini(prompt, temperature, maxTokens);
                } catch (Exception e2) {
                    if (isGroqEnabled()) {
                        log.warn("Gemini also failed, falling back to Groq. Error: {}", e2.getMessage());
                        return callGroq(prompt, temperature, maxTokens);
                    }
                    throw e2;
                }
            }
        }

        // Default: Gemini → Groq fallback
        try {
            return callGemini(prompt, temperature, maxTokens);
        } catch (Exception e) {
            if (isGroqEnabled()) {
                log.warn("Gemini failed, falling back to Groq. Error: {}", e.getMessage());
                return callGroq(prompt, temperature, maxTokens);
            }
            throw e;
        }
    }

    // ==================== Public Methods ====================

    public Map<String, Object> analyzeJobRelevance(String jobPosting, Notifier notifier, String educationInfo) {
        try {
            String prompt = buildPrompt(jobPosting, notifier, educationInfo);

            String generatedText = callAI(prompt, 0.3, 4000);

            log.debug("Generated text: {}", generatedText);

            String jsonText = extractJsonFromResponse(generatedText);

            JsonNode jsonNode = objectMapper.readTree(jsonText);
            Map<String, Object> result = new HashMap<>();

            result.put("score", jsonNode.has("score") ? jsonNode.get("score").asDouble() : 0.0);
            result.put("reason", jsonNode.has("reason") ? jsonNode.get("reason").asText() : "No reason provided");

            result.put("company", jsonNode.has("company") ? jsonNode.get("company").asText() : "Unknown");
            result.put("role", jsonNode.has("role") ? (jsonNode.get("role").isNull() ? null : jsonNode.get("role").asText()) : "Not specified");
            result.put("experience", jsonNode.has("experience") ? jsonNode.get("experience").asText() : "Not specified");
            result.put("location", jsonNode.has("location") ? jsonNode.get("location").asText() : "Not specified");
            result.put("salary", jsonNode.has("salary") ? jsonNode.get("salary").asText() : "Not specified");
            result.put("batch", jsonNode.has("batch") ? (jsonNode.get("batch").isNull() ? null : jsonNode.get("batch").asText()) : null);
            result.put("jobType", jsonNode.has("jobType") ? jsonNode.get("jobType").asText() : "Full-Time");
            result.put("deadline", jsonNode.has("deadline") ? (jsonNode.get("deadline").isNull() ? null : jsonNode.get("deadline").asText()) : null);
            result.put("duration", jsonNode.has("duration") ? (jsonNode.get("duration").isNull() ? null : jsonNode.get("duration").asText()) : null);
            result.put("description", jsonNode.has("description") ? jsonNode.get("description").asText() : jobPosting);
            result.put("jobLink", jsonNode.has("jobLink") ? (jsonNode.get("jobLink").isNull() ? null : jsonNode.get("jobLink").asText()) : null);

            log.info("AI Analysis completed. Score: {}, Company: {}, Role: {}, JobType: {}",
                    result.get("score"), result.get("company"), result.get("role"), result.get("jobType"));
            return result;

        } catch (Exception e) {
            log.error("Error analyzing job relevance with AI", e);
            Map<String, Object> result = new HashMap<>();
            result.put("score", 0.0);
            result.put("reason", "Error processing with AI: " + e.getMessage());
            result.put("company", "Unknown");
            result.put("role", "Not specified");
            result.put("experience", "Not specified");
            result.put("location", "Not specified");
            result.put("salary", "Not specified");
            result.put("batch", null);
            result.put("jobType", "Full-Time");
            result.put("deadline", null);
            result.put("duration", null);
            result.put("description", jobPosting);
            result.put("jobLink", null);
            return result;
        }
    }

    private String extractJsonFromResponse(String text) {
        text = text.trim();

        if (text.startsWith("```json")) {
            text = text.substring(7);
        } else if (text.startsWith("```")) {
            text = text.substring(3);
        }

        if (text.endsWith("```")) {
            text = text.substring(0, text.length() - 3);
        }

        return text.trim();
    }

    private String buildPrompt(String jobPosting, Notifier notifier, String educationInfo) {
        return promptTemplate
                .replace("{job}", jobPosting)
                .replace("{role}", notifier.getRole() != null ? notifier.getRole() : "Any")
                .replace("{skills}", notifier.getSkills() != null ? notifier.getSkills() : "Any")
                .replace("{city}", notifier.getCity() != null ? notifier.getCity() : "Any")
                .replace("{salary}", notifier.getSalaryExpectation() != null ? notifier.getSalaryExpectation() : "Any")
                .replace("{companies}", notifier.getCompaniesPreference() != null ? notifier.getCompaniesPreference() : "Any")
                .replace("{experience}", notifier.getExperience() != null ? notifier.getExperience() : "Any")
                .replace("{noticePeriod}", notifier.getNoticePeriod() != null ? notifier.getNoticePeriod() : "Any")
                .replace("{education}", educationInfo != null && !educationInfo.isEmpty() ? educationInfo : "Not specified");
    }

    public String modifyResumeForJob(String resumeLatex, String jobPosting) {
        try {
            String prompt = resumeModificationPrompt
                    .replace("{job}", jobPosting)
                    .replace("{resumeLatex}", resumeLatex);

            String modifiedLatex = callAI(prompt, 0.2, 8000);

            // Clean up the response - remove markdown code blocks if present
            modifiedLatex = modifiedLatex.trim();
            if (modifiedLatex.startsWith("```latex")) {
                modifiedLatex = modifiedLatex.substring(8);
            } else if (modifiedLatex.startsWith("```")) {
                modifiedLatex = modifiedLatex.substring(3);
            }
            if (modifiedLatex.endsWith("```")) {
                modifiedLatex = modifiedLatex.substring(0, modifiedLatex.length() - 3);
            }
            modifiedLatex = modifiedLatex.trim();

            log.info("Resume LaTeX modified successfully by AI");
            return modifiedLatex;

        } catch (Exception e) {
            log.error("Error modifying resume LaTeX with AI. Returning original LaTeX.", e);
            return resumeLatex;
        }
    }

    public String conductInterviewChat(String companyName, String role, String jobDescription,
                                        String resumeLatex, String userMessage,
                                        List<Map<String, String>> conversationHistory) {
        try {
            String systemPrompt = buildInterviewSystemPrompt(companyName, role, jobDescription, resumeLatex);

            if (openRouterEnabled) {
                try {
                    return conductInterviewChatOpenAIFormat(systemPrompt, companyName, role, userMessage, conversationHistory,
                            this::callOpenRouterMultiTurn, "OpenRouter");
                } catch (Exception e) {
                    log.warn("OpenRouter failed for interview chat, trying Gemini. Error: {}", e.getMessage());
                }
            }

            // Try Gemini
            try {
                return conductInterviewChatGemini(systemPrompt, companyName, role, userMessage, conversationHistory);
            } catch (Exception e) {
                if (isGroqEnabled()) {
                    log.warn("Gemini failed for interview chat, falling back to Groq. Error: {}", e.getMessage());
                    return conductInterviewChatOpenAIFormat(systemPrompt, companyName, role, userMessage, conversationHistory,
                            this::callGroqMultiTurn, "Groq");
                }
                throw e;
            }

        } catch (Exception e) {
            log.error("Error in interview chat with AI", e);
            return "I'm sorry, I encountered an error processing your response. Please try again.";
        }
    }

    @FunctionalInterface
    private interface MultiTurnCaller {
        String call(List<Map<String, String>> messages, double temperature, int maxTokens) throws Exception;
    }

    private String conductInterviewChatOpenAIFormat(String systemPrompt, String companyName, String role,
                                                     String userMessage, List<Map<String, String>> conversationHistory,
                                                     MultiTurnCaller caller, String providerName) throws Exception {
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));

        if (conversationHistory != null) {
            for (Map<String, String> msg : conversationHistory) {
                String msgRole = "model".equals(msg.get("role")) ? "assistant" : "user";
                messages.add(Map.of("role", msgRole, "content", msg.get("text")));
            }
        }

        messages.add(Map.of("role", "user", "content", userMessage));

        String generatedText = caller.call(messages, 0.7, 4000);
        log.info("Interview chat response generated via {} for {} at {}", providerName, role, companyName);
        return generatedText;
    }

    private String conductInterviewChatGemini(String systemPrompt, String companyName, String role,
                                               String userMessage, List<Map<String, String>> conversationHistory) throws Exception {
        List<Map<String, Object>> contents = new ArrayList<>();

        Map<String, Object> systemContent = new HashMap<>();
        systemContent.put("role", "user");
        systemContent.put("parts", List.of(Map.of("text", systemPrompt)));
        contents.add(systemContent);

        Map<String, Object> ackContent = new HashMap<>();
        ackContent.put("role", "model");
        ackContent.put("parts", List.of(Map.of("text",
                "Understood. I'm ready to conduct the interview. I'll act as an interviewer from "
                + companyName + " for the " + role + " position. I have reviewed the candidate's resume. "
                + "Let's begin whenever you're ready. How would you like to start?")));
        contents.add(ackContent);

        if (conversationHistory != null) {
            for (Map<String, String> msg : conversationHistory) {
                Map<String, Object> histContent = new HashMap<>();
                histContent.put("role", msg.get("role"));
                histContent.put("parts", List.of(Map.of("text", msg.get("text"))));
                contents.add(histContent);
            }
        }

        Map<String, Object> userContent = new HashMap<>();
        userContent.put("role", "user");
        userContent.put("parts", List.of(Map.of("text", userMessage)));
        contents.add(userContent);

        String generatedText = callGeminiMultiTurn(contents, 0.7, 4000);
        log.info("Interview chat response generated via Gemini for {} at {}", role, companyName);
        return generatedText;
    }

    private String buildInterviewSystemPrompt(String companyName, String role,
                                               String jobDescription, String resumeLatex) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are a senior interviewer at ").append(companyName != null ? companyName : "the company");
        sb.append(" conducting an interview for the position of ").append(role != null ? role : "the role");
        sb.append(".\n\n");
        sb.append("INTERVIEW GUIDELINES:\n");
        sb.append("- Act as a professional, friendly interviewer from this company\n");
        sb.append("- Ask relevant technical and behavioral questions based on the job requirements\n");
        sb.append("- After the candidate answers, provide constructive feedback on their response\n");
        sb.append("- Suggest how they could improve their answer\n");
        sb.append("- Ask follow-up questions when appropriate\n");
        sb.append("- Cover a mix of: technical skills, problem-solving, system design (if senior role), behavioral/situational questions\n");
        sb.append("- Keep your responses conversational and encouraging\n");
        sb.append("- If the candidate asks for help or hints, provide guidance without giving away the full answer\n");
        sb.append("- Tailor questions to the candidate's experience level based on their resume\n\n");

        if (jobDescription != null && !jobDescription.isEmpty()) {
            sb.append("JOB DESCRIPTION:\n").append(jobDescription).append("\n\n");
        }

        if (resumeLatex != null && !resumeLatex.isEmpty()) {
            sb.append("CANDIDATE'S RESUME (LaTeX format - extract relevant information):\n");
            sb.append(resumeLatex).append("\n\n");
        }

        sb.append("Begin by greeting the candidate and asking your first interview question based on the job requirements and their resume.");
        return sb.toString();
    }
}
