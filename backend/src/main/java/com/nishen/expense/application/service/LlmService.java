package com.nishen.expense.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nishen.expense.api.dto.OpenAiRequest;
import com.nishen.expense.api.dto.OpenAiResponse;
import com.nishen.expense.api.dto.ParsedTransactionResponse;
import com.nishen.expense.application.exception.OpenAiParseException;
import com.nishen.expense.infrastructure.config.OllamaConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Service
public class LlmService {

    private static final Logger log = LoggerFactory.getLogger(LlmService.class);

    private final OllamaConfig config;
    private final ObjectMapper objectMapper;

    public LlmService(OllamaConfig config,
                      ObjectMapper objectMapper) {
        this.config = config;
        this.objectMapper = objectMapper;
    }

    public ParsedTransactionResponse parseSms(String sms) {
        String prompt = """
                You are a transaction parser.
                Return exactly one JSON object and nothing else.
                Do not include explanations, markdown, code fences, or introductory text.

                Extract transaction details from this Sri Lankan banking SMS.

                Return ONLY valid JSON for this schema:
                {
                  "type": "INCOME or EXPENSE",
                  "amount": 0,
                  "merchant": "string",
                  "category": "string",
                  "transactionDate": "YYYY-MM-DD or original date string if exact date cannot be normalized"
                }

                Fields:
                - type
                - amount
                - merchant
                - category
                - transactionDate
                
                Rules:
                - Detect whether it is INCOME or EXPENSE
                - Normalize merchant names
                - Categorize appropriately for Sri Lankan merchants
                
                Categories:
                - Salary
                - Insurance & Financial Commitments
                - Household & Utilities
                - Internet, Mobile & Subscriptions
                - Groceries & Daily Essentials
                - Food & Dining
                - Fuel, Transport & Vehicle
                - Thattha's Support
                - Shopping & One-off Purchases
                
                SMS:
                %s
                """.formatted(sms);

        log.info("Ollama SMS parse request prepared model={} smsLength={}",
                config.getModel(),
                sms == null ? 0 : sms.length());

        OpenAiRequest request = new OpenAiRequest();
        request.setModel(config.getModel());
        request.setTemperature(0);

        request.setMessages(List.of(
                new OpenAiRequest.Message("user", prompt)
        ));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<OpenAiRequest> entity =
                new HttpEntity<>(request, headers);

        RestTemplate restTemplate = new RestTemplate();

        long startedAt = System.currentTimeMillis();
        OpenAiResponse response = restTemplate.postForObject(
                resolveChatCompletionsUrl(),
                entity,
                OpenAiResponse.class
        );
        long durationMs = System.currentTimeMillis() - startedAt;

        log.info("Ollama SMS parse response received model={} durationMs={}",
                config.getModel(),
                durationMs);

        if (response == null ||
                response.getChoices() == null ||
                response.getChoices().isEmpty()) {

            log.warn("Ollama returned an empty response model={} durationMs={}",
                    config.getModel(),
                    durationMs);
            throw new OpenAiParseException("Ollama returned an empty response.");
        }

        String content =
                response.getChoices()
                        .get(0)
                        .getMessage()
                        .getContent();

        try {
            ParsedTransactionResponse parsedTransaction = objectMapper.readValue(
                    normalizeJsonContent(content),
                    ParsedTransactionResponse.class
            );

            log.info("Ollama SMS parse response parsed type={} category={} merchantPresent={}",
                    parsedTransaction.getType(),
                    parsedTransaction.getCategory(),
                    parsedTransaction.getMerchant() != null && !parsedTransaction.getMerchant().isBlank());

            return parsedTransaction;
        } catch (Exception exception) {
            log.warn("Ollama response could not be parsed as a transaction contentLength={}",
                    content == null ? 0 : content.length(),
                    exception);
            throw new OpenAiParseException("Ollama response could not be parsed as a transaction.", exception);
        }
    }

    private String normalizeJsonContent(String content) {
        if (content == null) {
            log.warn("Ollama returned empty message content");
            throw new OpenAiParseException("Ollama returned empty message content.");
        }

        String normalized = content.trim();

        if (normalized.startsWith("```json")) {
            normalized = normalized.substring(7).trim();
        } else if (normalized.startsWith("```")) {
            normalized = normalized.substring(3).trim();
        }

        if (normalized.endsWith("```")) {
            normalized = normalized.substring(0, normalized.length() - 3).trim();
        }

        if (normalized.startsWith("{") && normalized.endsWith("}")) {
            return normalized;
        }

        String extractedJson = extractFirstJsonObject(normalized);
        if (extractedJson != null) {
            log.warn("Ollama returned extra text around JSON contentLength={}", content.length());
            return extractedJson;
        }

        return normalized;
    }

    private String extractFirstJsonObject(String content) {
        int start = content.indexOf('{');
        if (start < 0) {
            return null;
        }

        boolean inString = false;
        boolean escaping = false;
        int depth = 0;

        for (int index = start; index < content.length(); index++) {
            char current = content.charAt(index);

            if (escaping) {
                escaping = false;
                continue;
            }

            if (current == '\\' && inString) {
                escaping = true;
                continue;
            }

            if (current == '"') {
                inString = !inString;
                continue;
            }

            if (inString) {
                continue;
            }

            if (current == '{') {
                depth++;
            } else if (current == '}') {
                depth--;

                if (depth == 0) {
                    return content.substring(start, index + 1);
                }
            }
        }

        return null;
    }

    private String resolveChatCompletionsUrl() {
        String baseUrl = config.getBaseUrl();
        if (!StringUtils.hasText(baseUrl)) {
            throw new IllegalStateException("OLLAMA_BASE_URL is not configured.");
        }

        String normalizedBaseUrl = baseUrl.endsWith("/")
                ? baseUrl.substring(0, baseUrl.length() - 1)
                : baseUrl;

        return normalizedBaseUrl + "/chat/completions";
    }
}
