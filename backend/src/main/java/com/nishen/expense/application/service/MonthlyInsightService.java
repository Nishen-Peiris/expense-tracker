package com.nishen.expense.application.service;

import com.nishen.expense.api.dto.MonthlyInsightNarrative;
import com.nishen.expense.api.dto.MonthlyInsightPromptData;
import com.nishen.expense.api.dto.MonthlyInsightResponse;
import com.nishen.expense.domain.Transaction;
import com.nishen.expense.infrastructure.persistence.TransactionRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class MonthlyInsightService {

    private static final int HISTORY_PERIODS = 3;

    private final TransactionRepository transactionRepository;
    private final LlmService llmService;

    public MonthlyInsightService(TransactionRepository transactionRepository,
                                 LlmService llmService) {
        this.transactionRepository = transactionRepository;
        this.llmService = llmService;
    }

    public MonthlyInsightResponse getMonthlyInsight(LocalDate from, LocalDate to) {
        MonthlyInsightPromptData promptData = buildPromptData(from, to);
        MonthlyInsightNarrative narrative = llmService.generateMonthlyInsight(promptData);

        MonthlyInsightResponse response = new MonthlyInsightResponse();
        response.setFrom(promptData.getFrom());
        response.setTo(promptData.getTo());
        response.setAnalysisDate(promptData.getAnalysisDate());
        response.setCompletePeriod(promptData.isCompletePeriod());
        response.setDaysElapsed(promptData.getDaysElapsed());
        response.setTotalDays(promptData.getTotalDays());
        response.setHistoricalPeriodsUsed(promptData.getHistoricalPeriodsUsed());
        response.setIncomeSoFar(promptData.getIncomeSoFar());
        response.setExpensesSoFar(promptData.getExpensesSoFar());
        response.setRemainingSoFar(promptData.getRemainingSoFar());
        response.setDailyExpensePace(promptData.getDailyExpensePace());
        response.setProjectedMonthEndExpenses(promptData.getProjectedExpenseHybrid());
        response.setProjectedExpenseRangeLow(promptData.getProjectedExpenseRangeLow());
        response.setProjectedExpenseRangeHigh(promptData.getProjectedExpenseRangeHigh());
        response.setTopCategory(promptData.getTopCategory());
        response.setHeadline(narrative.getHeadline());
        response.setSummary(narrative.getSummary());
        response.setChanges(narrative.getChanges());
        response.setForecast(narrative.getForecast());
        response.setWatchout(narrative.getWatchout());
        response.setConfidence(
                narrative.getConfidence() == null || narrative.getConfidence().isBlank()
                        ? promptData.getConfidence()
                        : narrative.getConfidence()
        );
        return response;
    }

    private MonthlyInsightPromptData buildPromptData(LocalDate from, LocalDate to) {
        LocalDate today = LocalDate.now();
        LocalDate analysisDate = today;
        if (analysisDate.isAfter(to)) {
            analysisDate = to;
        }
        if (analysisDate.isBefore(from)) {
            analysisDate = from.minusDays(1);
        }

        int totalDays = daysInclusive(from, to);
        int daysElapsed = analysisDate.isBefore(from) ? 0 : daysInclusive(from, analysisDate);

        List<Transaction> currentTransactions = loadTransactions(from, analysisDate);
        SummaryTotals currentTotals = summarize(currentTransactions);

        List<HistoricalPeriod> historicalPeriods = new ArrayList<>();
        for (int index = 1; index <= HISTORY_PERIODS; index++) {
            LocalDate historicalFrom = from.minusMonths(index);
            LocalDate historicalTo = to.minusMonths(index);
            List<Transaction> historicalTransactions = loadTransactions(historicalFrom, historicalTo);
            if (historicalTransactions.isEmpty()) {
                continue;
            }

            LocalDate historicalPartialTo = daysElapsed == 0
                    ? historicalFrom.minusDays(1)
                    : historicalFrom.plusDays(daysElapsed - 1L);
            if (historicalPartialTo.isAfter(historicalTo)) {
                historicalPartialTo = historicalTo;
            }

            SummaryTotals historicalFullTotals = summarize(historicalTransactions);
            SummaryTotals historicalPartialTotals = summarize(
                    filterTransactionsByDate(historicalTransactions, historicalFrom, historicalPartialTo)
            );

            historicalPeriods.add(new HistoricalPeriod(
                    historicalFrom,
                    historicalTo,
                    historicalTransactions,
                    historicalFullTotals,
                    historicalPartialTotals
            ));
        }

        double averageHistoricalToDate = averageHistoricalExpensesToDate(historicalPeriods);
        double averageHistoricalFull = averageHistoricalFullPeriodExpenses(historicalPeriods);
        double dailyExpensePace = daysElapsed == 0 ? 0 : round(currentTotals.expenses / daysElapsed);
        double projectedCurrentPace = daysElapsed == 0 ? 0 : round(dailyExpensePace * totalDays);
        double projectedHistorical = averageHistoricalFull > 0
                ? averageHistoricalFull
                : projectedCurrentPace;
        double projectedHybrid = round(resolveHybridProjection(
                projectedCurrentPace,
                projectedHistorical,
                daysElapsed,
                totalDays,
                historicalPeriods.size()
        ));

        double projectionSpread = Math.max(
                Math.abs(projectedCurrentPace - projectedHistorical),
                projectedHybrid * 0.08
        );
        double projectedRangeLow = round(Math.max(0, projectedHybrid - projectionSpread));
        double projectedRangeHigh = round(projectedHybrid + projectionSpread);

        MonthlyInsightPromptData promptData = new MonthlyInsightPromptData();
        promptData.setFrom(from);
        promptData.setTo(to);
        promptData.setAnalysisDate(analysisDate.isBefore(from) ? from : analysisDate);
        promptData.setCompletePeriod(!today.isBefore(from) && !today.isBefore(to));
        promptData.setDaysElapsed(daysElapsed);
        promptData.setTotalDays(totalDays);
        promptData.setHistoricalPeriodsUsed(historicalPeriods.size());
        promptData.setIncomeSoFar(round(currentTotals.income));
        promptData.setExpensesSoFar(round(currentTotals.expenses));
        promptData.setRemainingSoFar(round(currentTotals.remaining));
        promptData.setAverageHistoricalExpensesToDate(round(averageHistoricalToDate));
        promptData.setAverageHistoricalFullPeriodExpenses(round(averageHistoricalFull));
        promptData.setDailyExpensePace(dailyExpensePace);
        promptData.setProjectedExpenseCurrentPace(projectedCurrentPace);
        promptData.setProjectedExpenseHistorical(round(projectedHistorical));
        promptData.setProjectedExpenseHybrid(projectedHybrid);
        promptData.setProjectedExpenseRangeLow(projectedRangeLow);
        promptData.setProjectedExpenseRangeHigh(projectedRangeHigh);
        promptData.setTopCategories(buildTopCategories(currentTransactions, currentTotals.expenses, historicalPeriods, daysElapsed));
        promptData.setLargestExpenses(buildLargestExpenses(currentTransactions));
        promptData.setTopCategory(
                promptData.getTopCategories().isEmpty()
                        ? "None"
                        : promptData.getTopCategories().get(0).getCategory()
        );
        promptData.setConfidence(resolveConfidence(historicalPeriods.size(), daysElapsed));
        return promptData;
    }

    private List<Transaction> loadTransactions(LocalDate from, LocalDate to) {
        if (to.isBefore(from)) {
            return List.of();
        }

        return transactionRepository.findByTransactionDateGreaterThanEqualAndTransactionDateLessThan(
                from.atStartOfDay(),
                to.plusDays(1).atStartOfDay()
        );
    }

    private List<Transaction> filterTransactionsByDate(List<Transaction> transactions,
                                                       LocalDate from,
                                                       LocalDate to) {
        if (to.isBefore(from)) {
            return List.of();
        }

        List<Transaction> filteredTransactions = new ArrayList<>();
        for (Transaction transaction : transactions) {
            LocalDate transactionDate = transaction.getTransactionDate().toLocalDate();
            if (!transactionDate.isBefore(from) && !transactionDate.isAfter(to)) {
                filteredTransactions.add(transaction);
            }
        }
        return filteredTransactions;
    }

    private SummaryTotals summarize(List<Transaction> transactions) {
        SummaryTotals summaryTotals = new SummaryTotals();

        for (Transaction transaction : transactions) {
            double amount = toDouble(transaction.getAmount());
            if ("INCOME".equalsIgnoreCase(transaction.getType())) {
                summaryTotals.income += amount;
                summaryTotals.remaining += amount;
            } else {
                summaryTotals.expenses += amount;
                summaryTotals.remaining -= amount;
            }
        }

        return summaryTotals;
    }

    private double averageHistoricalExpensesToDate(List<HistoricalPeriod> historicalPeriods) {
        if (historicalPeriods.isEmpty()) {
            return 0;
        }

        double total = 0;
        for (HistoricalPeriod historicalPeriod : historicalPeriods) {
            total += historicalPeriod.partialTotals.expenses;
        }
        return total / historicalPeriods.size();
    }

    private double averageHistoricalFullPeriodExpenses(List<HistoricalPeriod> historicalPeriods) {
        if (historicalPeriods.isEmpty()) {
            return 0;
        }

        double total = 0;
        for (HistoricalPeriod historicalPeriod : historicalPeriods) {
            total += historicalPeriod.fullTotals.expenses;
        }
        return total / historicalPeriods.size();
    }

    private List<MonthlyInsightPromptData.CategorySnapshot> buildTopCategories(
            List<Transaction> currentTransactions,
            double currentExpenses,
            List<HistoricalPeriod> historicalPeriods,
            int daysElapsed
    ) {
        Map<String, Double> currentCategoryTotals = new HashMap<>();
        for (Transaction transaction : currentTransactions) {
            if (!"EXPENSE".equalsIgnoreCase(transaction.getType())) {
                continue;
            }

            String category = transaction.getCategory() == null || transaction.getCategory().isBlank()
                    ? "Other"
                    : transaction.getCategory();
            currentCategoryTotals.merge(category, toDouble(transaction.getAmount()), Double::sum);
        }

        Map<String, Double> historicalCategoryAverages = new HashMap<>();
        for (HistoricalPeriod historicalPeriod : historicalPeriods) {
            Map<String, Double> periodTotals = new HashMap<>();
            List<Transaction> comparableTransactions = filterTransactionsByDate(
                    historicalPeriod.transactions,
                    historicalPeriod.from,
                    historicalPeriod.from.plusDays(Math.max(0, daysElapsed - 1L)).isAfter(historicalPeriod.to)
                            ? historicalPeriod.to
                            : historicalPeriod.from.plusDays(Math.max(0, daysElapsed - 1L))
            );

            for (Transaction transaction : comparableTransactions) {
                if (!"EXPENSE".equalsIgnoreCase(transaction.getType())) {
                    continue;
                }

                String category = transaction.getCategory() == null || transaction.getCategory().isBlank()
                        ? "Other"
                        : transaction.getCategory();
                periodTotals.merge(category, toDouble(transaction.getAmount()), Double::sum);
            }

            for (Map.Entry<String, Double> entry : periodTotals.entrySet()) {
                historicalCategoryAverages.merge(entry.getKey(), entry.getValue(), Double::sum);
            }
        }

        List<MonthlyInsightPromptData.CategorySnapshot> topCategories = new ArrayList<>();
        List<Map.Entry<String, Double>> sortedEntries = new ArrayList<>(currentCategoryTotals.entrySet());
        sortedEntries.sort(Map.Entry.<String, Double>comparingByValue().reversed());

        int limit = Math.min(3, sortedEntries.size());
        for (int index = 0; index < limit; index++) {
            Map.Entry<String, Double> entry = sortedEntries.get(index);
            double historicalAverage = historicalPeriods.isEmpty()
                    ? 0
                    : historicalCategoryAverages.getOrDefault(entry.getKey(), 0D) / historicalPeriods.size();

            MonthlyInsightPromptData.CategorySnapshot snapshot = new MonthlyInsightPromptData.CategorySnapshot();
            snapshot.setCategory(entry.getKey());
            snapshot.setAmount(round(entry.getValue()));
            snapshot.setShareOfExpensesPct(currentExpenses == 0 ? 0 : round((entry.getValue() / currentExpenses) * 100));
            snapshot.setHistoricalAverageAmount(round(historicalAverage));
            snapshot.setDeltaPct(historicalAverage == 0 ? 0 : round(((entry.getValue() - historicalAverage) / historicalAverage) * 100));
            topCategories.add(snapshot);
        }

        return topCategories;
    }

    private List<MonthlyInsightPromptData.TransactionSnapshot> buildLargestExpenses(List<Transaction> transactions) {
        List<Transaction> expenseTransactions = new ArrayList<>();
        for (Transaction transaction : transactions) {
            if ("EXPENSE".equalsIgnoreCase(transaction.getType())) {
                expenseTransactions.add(transaction);
            }
        }

        expenseTransactions.sort(Comparator.comparing(Transaction::getAmount).reversed());

        List<MonthlyInsightPromptData.TransactionSnapshot> largestExpenses = new ArrayList<>();
        int limit = Math.min(3, expenseTransactions.size());
        for (int index = 0; index < limit; index++) {
            Transaction transaction = expenseTransactions.get(index);
            MonthlyInsightPromptData.TransactionSnapshot snapshot = new MonthlyInsightPromptData.TransactionSnapshot();
            snapshot.setMerchant(transaction.getMerchant());
            snapshot.setCategory(transaction.getCategory());
            snapshot.setAmount(round(toDouble(transaction.getAmount())));
            snapshot.setTransactionDate(transaction.getTransactionDate().toLocalDate());
            largestExpenses.add(snapshot);
        }

        return largestExpenses;
    }

    private double resolveHybridProjection(double currentPaceProjection,
                                           double historicalProjection,
                                           int daysElapsed,
                                           int totalDays,
                                           int historicalPeriodsUsed) {
        if (historicalPeriodsUsed == 0) {
            return currentPaceProjection;
        }

        if (daysElapsed == 0) {
            return historicalProjection;
        }

        double progressRatio = totalDays == 0 ? 0 : (double) daysElapsed / totalDays;
        double currentWeight;
        if (progressRatio < 0.33) {
            currentWeight = 0.35;
        } else if (progressRatio < 0.66) {
            currentWeight = 0.5;
        } else {
            currentWeight = 0.7;
        }

        double historicalWeight = 1 - currentWeight;
        return (currentPaceProjection * currentWeight) + (historicalProjection * historicalWeight);
    }

    private String resolveConfidence(int historicalPeriodsUsed, int daysElapsed) {
        if (historicalPeriodsUsed >= 3 && daysElapsed >= 7) {
            return "HIGH";
        }
        if (historicalPeriodsUsed >= 2 && daysElapsed >= 4) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private int daysInclusive(LocalDate from, LocalDate to) {
        return (int) ChronoUnit.DAYS.between(from, to) + 1;
    }

    private double toDouble(BigDecimal value) {
        return value == null ? 0 : value.doubleValue();
    }

    private double round(double value) {
        return BigDecimal.valueOf(value)
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private static class SummaryTotals {
        private double income;
        private double expenses;
        private double remaining;
    }

    private record HistoricalPeriod(
            LocalDate from,
            LocalDate to,
            List<Transaction> transactions,
            SummaryTotals fullTotals,
            SummaryTotals partialTotals
    ) {
    }
}
