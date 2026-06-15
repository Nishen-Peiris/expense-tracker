package com.nishen.expense.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nishen.expense.api.dto.MonthlyInsightNarrative;
import com.nishen.expense.api.dto.MonthlyInsightPromptData;
import com.nishen.expense.api.dto.OpenAiRequest;
import com.nishen.expense.api.dto.OpenAiResponse;
import com.nishen.expense.api.dto.ParsedTransactionResponse;
import com.nishen.expense.application.exception.OpenAiParseException;
import com.nishen.expense.infrastructure.config.LlmConfig;
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

    private final LlmConfig config;
    private final ObjectMapper objectMapper;

    public LlmService(LlmConfig config,
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

        log.info("LLM SMS parse request prepared model={} smsLength={}",
                config.getModel(),
                sms == null ? 0 : sms.length());

        OpenAiResponse response = sendPrompt(prompt);

        String content = extractContent(response, "transaction");

        try {
            ParsedTransactionResponse parsedTransaction = objectMapper.readValue(
                    normalizeJsonContent(content),
                    ParsedTransactionResponse.class
            );

            log.info("LLM SMS parse response parsed type={} category={} merchantPresent={}",
                    parsedTransaction.getType(),
                    parsedTransaction.getCategory(),
                    parsedTransaction.getMerchant() != null && !parsedTransaction.getMerchant().isBlank());

            return parsedTransaction;
        } catch (Exception exception) {
            log.warn("LLM response could not be parsed as a transaction contentLength={}",
                    content == null ? 0 : content.length(),
                    exception);
            throw new OpenAiParseException("LLM response could not be parsed as a transaction.", exception);
        }
    }

    public MonthlyInsightNarrative generateMonthlyInsight(MonthlyInsightPromptData promptData) {
        try {
            String prompt = """
                    You are a personal finance analyst.
                    Return exactly one JSON object and nothing else.
                    Do not include explanations, markdown, code fences, or introductory text.

                    Use only the structured data provided below.
                    Do not invent categories, totals, dates, or confidence levels.
                    If history is limited, say so directly.
                    Keep each text field concise and factual.

                    Return ONLY valid JSON for this schema:
                    {
                      "headline": "string",
                      "summary": "string",
                      "changes": "string",
                      "forecast": "string",
                      "watchout": "string",
                      "confidence": "LOW or MEDIUM or HIGH"
                    }

                    Field guidance:
                    - headline: one short sentence about the current month so far
                    - summary: current state using income, expense, balance, and pace
                    - changes: what categories or transactions stand out versus history
                    - forecast: month-end projection and what it depends on
                    - watchout: one concrete risk or category to monitor
                    - confidence: must be LOW, MEDIUM, or HIGH and should align with the data

                    Structured data:
                    %s
                    """.formatted(objectMapper.writeValueAsString(promptData));

            log.info("LLM monthly insight request prepared model={} historicalPeriodsUsed={}",
                    config.getModel(),
                    promptData.getHistoricalPeriodsUsed());

            OpenAiResponse response = sendPrompt(prompt);
            String content = extractContent(response, "monthly insight");

            MonthlyInsightNarrative narrative = objectMapper.readValue(
                    normalizeJsonContent(content),
                    MonthlyInsightNarrative.class
            );

            log.info("LLM monthly insight response parsed confidence={} headlinePresent={}",
                    narrative.getConfidence(),
                    narrative.getHeadline() != null && !narrative.getHeadline().isBlank());

            return narrative;
        } catch (OpenAiParseException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new OpenAiParseException("LLM response could not be parsed as a monthly insight.", exception);
        }
    }

    private OpenAiResponse sendPrompt(String prompt) {
        OpenAiRequest request = new OpenAiRequest();
        request.setModel(config.getModel());
        request.setTemperature(0);

        request.setMessages(List.of(
                new OpenAiRequest.Message("user", prompt)
        ));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (StringUtils.hasText(config.getApiKey())) {
            headers.setBearerAuth(config.getApiKey());
        }

        HttpEntity<OpenAiRequest> entity = new HttpEntity<>(request, headers);
        RestTemplate restTemplate = new RestTemplate();
        long startedAt = System.currentTimeMillis();
        OpenAiResponse response = restTemplate.postForObject(
                resolveChatCompletionsUrl(),
                entity,
                OpenAiResponse.class
        );
        long durationMs = System.currentTimeMillis() - startedAt;

        if (response == null ||
                response.getChoices() == null ||
                response.getChoices().isEmpty()) {

            log.warn("LLM returned an empty response model={} durationMs={}",
                    config.getModel(),
                    durationMs);
            throw new OpenAiParseException("LLM returned an empty response.");
        }

        log.info("LLM response received model={} durationMs={}",
                config.getModel(),
                durationMs);

        return response;
    }

    private String extractContent(OpenAiResponse response, String responseType) {
        String content = response.getChoices()
                .get(0)
                .getMessage()
                .getContent();

        if (content == null || content.isBlank()) {
            log.warn("LLM returned blank {} content", responseType);
            throw new OpenAiParseException("LLM returned blank " + responseType + " content.");
        }

        return content;
    }

    private String normalizeJsonContent(String content) {
        if (content == null) {
            log.warn("LLM returned empty message content");
            throw new OpenAiParseException("LLM returned empty message content.");
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
            log.warn("LLM returned extra text around JSON contentLength={}", content.length());
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
            throw new IllegalStateException("LLM_BASE_URL is not configured.");
        }

        String normalizedBaseUrl = baseUrl.endsWith("/")
                ? baseUrl.substring(0, baseUrl.length() - 1)
                : baseUrl;

        return normalizedBaseUrl + "/chat/completions";
    }
}
