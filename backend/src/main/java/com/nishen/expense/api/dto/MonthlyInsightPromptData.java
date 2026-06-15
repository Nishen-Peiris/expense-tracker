package com.nishen.expense.api.dto;

import java.time.LocalDate;
import java.util.List;

public class MonthlyInsightPromptData {

    private LocalDate from;
    private LocalDate to;
    private LocalDate analysisDate;
    private boolean completePeriod;
    private int daysElapsed;
    private int totalDays;
    private int historicalPeriodsUsed;
    private double incomeSoFar;
    private double expensesSoFar;
    private double remainingSoFar;
    private double averageHistoricalExpensesToDate;
    private double averageHistoricalFullPeriodExpenses;
    private double dailyExpensePace;
    private double projectedExpenseCurrentPace;
    private double projectedExpenseHistorical;
    private double projectedExpenseHybrid;
    private double projectedExpenseRangeLow;
    private double projectedExpenseRangeHigh;
    private String topCategory;
    private List<CategorySnapshot> topCategories;
    private List<TransactionSnapshot> largestExpenses;
    private String confidence;

    public LocalDate getFrom() {
        return from;
    }

    public void setFrom(LocalDate from) {
        this.from = from;
    }

    public LocalDate getTo() {
        return to;
    }

    public void setTo(LocalDate to) {
        this.to = to;
    }

    public LocalDate getAnalysisDate() {
        return analysisDate;
    }

    public void setAnalysisDate(LocalDate analysisDate) {
        this.analysisDate = analysisDate;
    }

    public boolean isCompletePeriod() {
        return completePeriod;
    }

    public void setCompletePeriod(boolean completePeriod) {
        this.completePeriod = completePeriod;
    }

    public int getDaysElapsed() {
        return daysElapsed;
    }

    public void setDaysElapsed(int daysElapsed) {
        this.daysElapsed = daysElapsed;
    }

    public int getTotalDays() {
        return totalDays;
    }

    public void setTotalDays(int totalDays) {
        this.totalDays = totalDays;
    }

    public int getHistoricalPeriodsUsed() {
        return historicalPeriodsUsed;
    }

    public void setHistoricalPeriodsUsed(int historicalPeriodsUsed) {
        this.historicalPeriodsUsed = historicalPeriodsUsed;
    }

    public double getIncomeSoFar() {
        return incomeSoFar;
    }

    public void setIncomeSoFar(double incomeSoFar) {
        this.incomeSoFar = incomeSoFar;
    }

    public double getExpensesSoFar() {
        return expensesSoFar;
    }

    public void setExpensesSoFar(double expensesSoFar) {
        this.expensesSoFar = expensesSoFar;
    }

    public double getRemainingSoFar() {
        return remainingSoFar;
    }

    public void setRemainingSoFar(double remainingSoFar) {
        this.remainingSoFar = remainingSoFar;
    }

    public double getAverageHistoricalExpensesToDate() {
        return averageHistoricalExpensesToDate;
    }

    public void setAverageHistoricalExpensesToDate(double averageHistoricalExpensesToDate) {
        this.averageHistoricalExpensesToDate = averageHistoricalExpensesToDate;
    }

    public double getAverageHistoricalFullPeriodExpenses() {
        return averageHistoricalFullPeriodExpenses;
    }

    public void setAverageHistoricalFullPeriodExpenses(double averageHistoricalFullPeriodExpenses) {
        this.averageHistoricalFullPeriodExpenses = averageHistoricalFullPeriodExpenses;
    }

    public double getDailyExpensePace() {
        return dailyExpensePace;
    }

    public void setDailyExpensePace(double dailyExpensePace) {
        this.dailyExpensePace = dailyExpensePace;
    }

    public double getProjectedExpenseCurrentPace() {
        return projectedExpenseCurrentPace;
    }

    public void setProjectedExpenseCurrentPace(double projectedExpenseCurrentPace) {
        this.projectedExpenseCurrentPace = projectedExpenseCurrentPace;
    }

    public double getProjectedExpenseHistorical() {
        return projectedExpenseHistorical;
    }

    public void setProjectedExpenseHistorical(double projectedExpenseHistorical) {
        this.projectedExpenseHistorical = projectedExpenseHistorical;
    }

    public double getProjectedExpenseHybrid() {
        return projectedExpenseHybrid;
    }

    public void setProjectedExpenseHybrid(double projectedExpenseHybrid) {
        this.projectedExpenseHybrid = projectedExpenseHybrid;
    }

    public double getProjectedExpenseRangeLow() {
        return projectedExpenseRangeLow;
    }

    public void setProjectedExpenseRangeLow(double projectedExpenseRangeLow) {
        this.projectedExpenseRangeLow = projectedExpenseRangeLow;
    }

    public double getProjectedExpenseRangeHigh() {
        return projectedExpenseRangeHigh;
    }

    public void setProjectedExpenseRangeHigh(double projectedExpenseRangeHigh) {
        this.projectedExpenseRangeHigh = projectedExpenseRangeHigh;
    }

    public String getTopCategory() {
        return topCategory;
    }

    public void setTopCategory(String topCategory) {
        this.topCategory = topCategory;
    }

    public List<CategorySnapshot> getTopCategories() {
        return topCategories;
    }

    public void setTopCategories(List<CategorySnapshot> topCategories) {
        this.topCategories = topCategories;
    }

    public List<TransactionSnapshot> getLargestExpenses() {
        return largestExpenses;
    }

    public void setLargestExpenses(List<TransactionSnapshot> largestExpenses) {
        this.largestExpenses = largestExpenses;
    }

    public String getConfidence() {
        return confidence;
    }

    public void setConfidence(String confidence) {
        this.confidence = confidence;
    }

    public static class CategorySnapshot {

        private String category;
        private double amount;
        private double shareOfExpensesPct;
        private double historicalAverageAmount;
        private double deltaPct;

        public String getCategory() {
            return category;
        }

        public void setCategory(String category) {
            this.category = category;
        }

        public double getAmount() {
            return amount;
        }

        public void setAmount(double amount) {
            this.amount = amount;
        }

        public double getShareOfExpensesPct() {
            return shareOfExpensesPct;
        }

        public void setShareOfExpensesPct(double shareOfExpensesPct) {
            this.shareOfExpensesPct = shareOfExpensesPct;
        }

        public double getHistoricalAverageAmount() {
            return historicalAverageAmount;
        }

        public void setHistoricalAverageAmount(double historicalAverageAmount) {
            this.historicalAverageAmount = historicalAverageAmount;
        }

        public double getDeltaPct() {
            return deltaPct;
        }

        public void setDeltaPct(double deltaPct) {
            this.deltaPct = deltaPct;
        }
    }

    public static class TransactionSnapshot {

        private String merchant;
        private String category;
        private double amount;
        private LocalDate transactionDate;

        public String getMerchant() {
            return merchant;
        }

        public void setMerchant(String merchant) {
            this.merchant = merchant;
        }

        public String getCategory() {
            return category;
        }

        public void setCategory(String category) {
            this.category = category;
        }

        public double getAmount() {
            return amount;
        }

        public void setAmount(double amount) {
            this.amount = amount;
        }

        public LocalDate getTransactionDate() {
            return transactionDate;
        }

        public void setTransactionDate(LocalDate transactionDate) {
            this.transactionDate = transactionDate;
        }
    }
}
