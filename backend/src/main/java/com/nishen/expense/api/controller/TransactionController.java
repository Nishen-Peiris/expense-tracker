package com.nishen.expense.api.controller;

import com.nishen.expense.domain.Transaction;
import com.nishen.expense.infrastructure.persistence.TransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@CrossOrigin
public class TransactionController {

    private static final Logger log = LoggerFactory.getLogger(TransactionController.class);

    private final TransactionRepository repository;

    public TransactionController(TransactionRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Transaction> getTransactions(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to
    ) {
        DateRange dateRange = resolveDateRange(from, to);

        log.info("Transaction list requested from={} to={}", dateRange.from(), dateRange.to());

        List<Transaction> transactions = repository.findByTransactionDateGreaterThanEqualAndTransactionDateLessThan(
                dateRange.from().atStartOfDay(),
                dateRange.to().plusDays(1).atStartOfDay()
        );

        log.info("Transaction list completed count={}", transactions.size());

        return transactions;
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

    @PostMapping
    public Transaction createTransaction(@RequestBody Transaction transaction) {
        log.info("Transaction create requested type={} category={} amountPresent={}",
                transaction.getType(),
                transaction.getCategory(),
                transaction.getAmount() != null);

        Transaction savedTransaction = repository.save(transaction);

        log.info("Transaction created id={} type={} category={} amountPresent={}",
                savedTransaction.getId(),
                savedTransaction.getType(),
                savedTransaction.getCategory(),
                savedTransaction.getAmount() != null);

        return savedTransaction;
    }

    @DeleteMapping("/{id}")
    public void deleteTransaction(@PathVariable Long id) {
        log.info("Transaction delete requested id={}", id);

        repository.deleteById(id);

        log.info("Transaction deleted id={}", id);
    }
}
