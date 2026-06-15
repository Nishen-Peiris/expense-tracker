package com.nishen.expense.api.dto;

import java.time.LocalDate;

public class MonthlyInsightResponse {

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
    private double dailyExpensePace;
    private double projectedMonthEndExpenses;
    private double projectedExpenseRangeLow;
    private double projectedExpenseRangeHigh;
    private String topCategory;
    private String headline;
    private String summary;
    private String changes;
    private String forecast;
    private String watchout;
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

    public double getDailyExpensePace() {
        return dailyExpensePace;
    }

    public void setDailyExpensePace(double dailyExpensePace) {
        this.dailyExpensePace = dailyExpensePace;
    }

    public double getProjectedMonthEndExpenses() {
        return projectedMonthEndExpenses;
    }

    public void setProjectedMonthEndExpenses(double projectedMonthEndExpenses) {
        this.projectedMonthEndExpenses = projectedMonthEndExpenses;
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

    public String getHeadline() {
        return headline;
    }

    public void setHeadline(String headline) {
        this.headline = headline;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getChanges() {
        return changes;
    }

    public void setChanges(String changes) {
        this.changes = changes;
    }

    public String getForecast() {
        return forecast;
    }

    public void setForecast(String forecast) {
        this.forecast = forecast;
    }

    public String getWatchout() {
        return watchout;
    }

    public void setWatchout(String watchout) {
        this.watchout = watchout;
    }

    public String getConfidence() {
        return confidence;
    }

    public void setConfidence(String confidence) {
        this.confidence = confidence;
    }
}
