package com.nishen.expense.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.nishen.expense.api.dto.AssistantRequest;
import com.nishen.expense.api.dto.AssistantResponse;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
public class OllamaAssistantService {
    public AssistantResponse chat(String baseUrl, String model, String prompt) {
        AssistantRequest request = new AssistantRequest();
        request.setBaseUrl(baseUrl);
        request.setModel(model);
        request.setPrompt(prompt);
        return ask(request);
    }

    public AssistantResponse ask(AssistantRequest request) {
        URI baseUri = validate(request);
        String endpoint = baseUri.toString().replaceAll("/+$", "") + "/api/chat";
        Map<String, Object> body = Map.of(
                "model", request.getModel().trim(),
                "messages", List.of(Map.of("role", "user", "content", request.getPrompt().trim())),
                "stream", false,
                "think", false
        );
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofMinutes(2));
        JsonNode response = new RestTemplate(factory).postForObject(endpoint, new HttpEntity<>(body, headers), JsonNode.class);
        String content = response == null ? null : response.path("message").path("content").asText(null);
        if (content == null || content.isBlank()) throw new IllegalStateException("Ollama returned an empty response.");
        return new AssistantResponse(content.trim(), request.getModel().trim());
    }

    private URI validate(AssistantRequest request) {
        if (request == null || request.getBaseUrl() == null || request.getBaseUrl().isBlank()) throw new IllegalArgumentException("Ollama URL is required.");
        if (request.getModel() == null || request.getModel().isBlank()) throw new IllegalArgumentException("Ollama model is required.");
        if (request.getPrompt() == null || request.getPrompt().isBlank()) throw new IllegalArgumentException("Prompt is required.");
        if (request.getPrompt().length() > 50_000) throw new IllegalArgumentException("Prompt is too large.");
        URI uri = URI.create(request.getBaseUrl().trim());
        if (!("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme())) || uri.getHost() == null) {
            throw new IllegalArgumentException("Enter a valid HTTP or HTTPS Ollama URL.");
        }
        if (uri.getRawQuery() != null || uri.getRawFragment() != null) throw new IllegalArgumentException("Ollama URL cannot include a query or fragment.");
        return uri;
    }
}
