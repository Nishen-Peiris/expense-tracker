package com.nishen.expense.api.controller;

import com.nishen.expense.api.dto.ParsedTransactionResponse;
import com.nishen.expense.api.dto.SmsParseRequest;
import com.nishen.expense.application.service.LlmService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/ai", "/api/ai"})
@CrossOrigin
public class AiController {

    private static final Logger log = LoggerFactory.getLogger(AiController.class);

    private final LlmService llmService;

    public AiController(LlmService llmService) {
        this.llmService = llmService;
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
}
