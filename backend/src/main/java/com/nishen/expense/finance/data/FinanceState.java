package com.nishen.expense.finance.data;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "finance_state")
public class FinanceState {
    @Id
    @Column(name = "user_id", length = 64, nullable = false)
    private String userId;

    @Column(name = "document", columnDefinition = "json", nullable = false)
    @JdbcTypeCode(SqlTypes.JSON)
    private JsonNode document;

    @Version
    @Column(nullable = false)
    private long revision;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected FinanceState() { }
    public FinanceState(String userId, JsonNode document) { this.userId = userId; this.document = document; this.updatedAt = Instant.now(); }
    public String getUserId() { return userId; }
    public JsonNode getDocument() { return document; }
    public long getRevision() { return revision; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void replaceDocument(JsonNode document) { this.document = document; this.updatedAt = Instant.now(); }
}
