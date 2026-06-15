package com.nishen.expense.api.dto;

public class MonthlyInsightNarrative {

    private String headline;
    private String summary;
    private String changes;
    private String forecast;
    private String watchout;
    private String confidence;

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
