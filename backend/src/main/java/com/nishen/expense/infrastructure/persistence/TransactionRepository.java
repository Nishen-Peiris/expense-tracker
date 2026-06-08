package com.nishen.expense.infrastructure.persistence;

import com.nishen.expense.domain.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByTransactionDateGreaterThanEqualAndTransactionDateLessThan(
            LocalDateTime start,
            LocalDateTime end
    );
}
