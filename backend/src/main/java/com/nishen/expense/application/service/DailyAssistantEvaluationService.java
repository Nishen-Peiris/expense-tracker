package com.nishen.expense.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nishen.expense.finance.data.FinanceState;
import com.nishen.expense.finance.data.FinanceStateRepository;
import jakarta.transaction.Transactional;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class DailyAssistantEvaluationService {
    private static final int RUN_HOUR = 5;
    private final FinanceStateRepository repository;
    private final OllamaAssistantService ollama;

    public DailyAssistantEvaluationService(FinanceStateRepository repository, OllamaAssistantService ollama) {
        this.repository = repository;
        this.ollama = ollama;
    }

    @Scheduled(cron = "0 */15 * * * *")
    @Transactional
    public void evaluateDueAccounts() {
        repository.findAll().forEach(this::evaluateIfDue);
    }

    private void evaluateIfDue(FinanceState state) {
        JsonNode document = state.getDocument();
        JsonNode settings = document.path("settings");
        String baseUrl = settings.path("ollamaUrl").asText("");
        String model = settings.path("ollamaModel").asText("");
        if (baseUrl.isBlank() || model.isBlank()) return;

        ZoneId zone;
        try { zone = ZoneId.of(settings.path("timezone").asText("UTC")); }
        catch (Exception ignored) { zone = ZoneId.of("UTC"); }
        var now = java.time.ZonedDateTime.now(zone);
        if (now.getHour() < RUN_HOUR) return;

        String key = LocalDate.now(zone) + "|" + YearMonth.now(zone) + "|" + baseUrl.replaceAll("/+$", "") + "|" + model;
        if (key.equals(settings.path("aiEvaluation").path("key").asText())) return;

        String financeJson = document.toString();
        if (financeJson.length() > 45_000) financeJson = financeJson.substring(0, 45_000);
        String prompt = "You are a concise personal finance analyst. Evaluate the current financial month using only the JSON data supplied. "
            + "Return plain text in this exact structure: a one-line headline, then at most four short bullet points beginning with •. "
            + "Mention material risks, budget pressure, savings pace, and upcoming bills only when supported. Do not invent facts.\n\nDATA:\n"
            + financeJson;
        Instant started = Instant.now();
        try {
            String content = ollama.chat(baseUrl, model, prompt).content();
            ObjectNode evaluation = ((ObjectNode) settings).putObject("aiEvaluation");
            evaluation.put("key", key);
            evaluation.put("content", content);
            evaluation.put("generatedAt", Instant.now().toString());
            evaluation.put("durationMs", Duration.between(started, Instant.now()).toMillis());
            evaluation.put("model", model);
            state.replaceDocument(document);
            repository.save(state);
        } catch (RuntimeException ignored) {
            // A temporary Ollama outage is retried on the next scheduler interval.
        }
    }
}
