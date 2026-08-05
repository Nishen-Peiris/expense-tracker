package com.nishen.expense.finance.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.nishen.expense.finance.data.FinanceState;
import com.nishen.expense.finance.data.FinanceStateRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/data")
public class FinanceDataController {
    private static final List<String> COLLECTIONS = List.of("accounts", "categories", "transactions", "budgets", "bills", "goals", "holdings", "loans", "widgets");
    private final FinanceStateRepository repository;
    public FinanceDataController(FinanceStateRepository repository) { this.repository = repository; }

    @GetMapping
    public ResponseEntity<JsonNode> read(@RequestHeader(name = "X-User-Id", defaultValue = "local-user") String userId) {
        validateUserId(userId);
        return repository.findById(userId).map(state -> ResponseEntity.ok().header("ETag", String.valueOf(state.getRevision())).body(state.getDocument())).orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> write(@RequestHeader(name = "X-User-Id", defaultValue = "local-user") String userId, @RequestBody JsonNode document) {
        validateUserId(userId); validateDocument(document);
        FinanceState state = repository.findById(userId).orElseGet(() -> new FinanceState(userId, document));
        state.replaceDocument(document);
        FinanceState saved = repository.saveAndFlush(state);
        return ResponseEntity.ok(Map.of("revision", saved.getRevision(), "updatedAt", saved.getUpdatedAt().toString()));
    }

    private void validateUserId(String userId) { if (!userId.matches("[A-Za-z0-9_-]{1,64}")) throw new IllegalArgumentException("Invalid user identifier"); }
    private void validateDocument(JsonNode document) {
        if (!document.isObject() || document.path("version").asInt() != 1 || !document.path("settings").isObject()) throw new IllegalArgumentException("Invalid finance data document");
        for (String collection : COLLECTIONS) if (!document.path(collection).isArray()) throw new IllegalArgumentException("Missing collection: " + collection);
    }
}
