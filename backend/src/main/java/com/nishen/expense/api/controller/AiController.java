package com.nishen.expense.api.controller;

import com.nishen.expense.api.dto.MonthlyInsightResponse;
import com.nishen.expense.api.dto.ParsedTransactionResponse;
import com.nishen.expense.api.dto.SmsParseRequest;
import com.nishen.expense.api.dto.AssistantRequest;
import com.nishen.expense.api.dto.AssistantResponse;
import com.nishen.expense.application.service.LlmService;
import com.nishen.expense.application.service.MonthlyInsightService;
import com.nishen.expense.application.service.OllamaAssistantService;
import org.springframework.format.annotation.DateTimeFormat;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping({"/ai", "/api/ai"})
@CrossOrigin
public class AiController {

    private static final Logger log = LoggerFactory.getLogger(AiController.class);

    private final LlmService llmService;
    private final MonthlyInsightService monthlyInsightService;
    private final OllamaAssistantService ollamaAssistantService;

    public AiController(LlmService llmService,
                        MonthlyInsightService monthlyInsightService,
                        OllamaAssistantService ollamaAssistantService) {
        this.llmService = llmService;
        this.monthlyInsightService = monthlyInsightService;
        this.ollamaAssistantService = ollamaAssistantService;
    }

    @PostMapping("/assistant")
    public AssistantResponse assistant(@RequestBody AssistantRequest request) {
        return ollamaAssistantService.ask(request);
    }

    @PostMapping("/parse-sms")
    public ParsedTransactionResponse parseSms(
            @RequestBody SmsParseRequest request
    ) throws Exception {

        log.info("SMS parse requested smsLength={}", request.getSms() == null ? 0 : request.getSms().length());

        ParsedTransactionResponse response = llmService.parseSms(request.getSms());

        log.info("SMS parse completed type={} category={} merchantPresent={}",
                response.getType(),
                response.getCategory(),
                response.getMerchant() != null && !response.getMerchant().isBlank());

        return response;
    }

    @GetMapping("/month-insight")
    public MonthlyInsightResponse getMonthlyInsight(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to
    ) {
        DateRange dateRange = resolveDateRange(from, to);

        log.info("Monthly insight requested from={} to={}", dateRange.from(), dateRange.to());

        MonthlyInsightResponse response = monthlyInsightService.getMonthlyInsight(
                dateRange.from(),
                dateRange.to()
        );

        log.info("Monthly insight completed from={} to={} confidence={}",
                response.getFrom(),
                response.getTo(),
                response.getConfidence());

        return response;
    }

    private DateRange resolveDateRange(LocalDate from, LocalDate to) {
        if (from != null && to != null) {
            return new DateRange(from, to);
        }

        LocalDate today = LocalDate.now();
        LocalDate periodStart = today.getDayOfMonth() >= 25
                ? today.withDayOfMonth(25)
                : today.minusMonths(1).withDayOfMonth(25);

        return new DateRange(periodStart, periodStart.plusMonths(1).minusDays(1));
    }

    private record DateRange(LocalDate from, LocalDate to) {
    }
}
