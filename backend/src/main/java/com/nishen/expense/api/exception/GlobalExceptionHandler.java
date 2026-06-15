package com.nishen.expense.api.exception;

import com.nishen.expense.application.exception.OpenAiParseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(IllegalStateException.class)
    public ProblemDetail handleIllegalState(IllegalStateException exception) {
        log.error("Application configuration error", exception);

        ProblemDetail problemDetail = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        problemDetail.setTitle("Application configuration error");
        problemDetail.setDetail(exception.getMessage());
        return problemDetail;
    }

    @ExceptionHandler(HttpClientErrorException.class)
    public ProblemDetail handleOpenAiClientError(HttpClientErrorException exception) {
        log.warn("LLM request failed status={}", exception.getStatusCode().value(), exception);

        ProblemDetail problemDetail = ProblemDetail.forStatus(HttpStatus.BAD_GATEWAY);
        problemDetail.setTitle("LLM request failed");
        problemDetail.setDetail("The model endpoint returned HTTP " + exception.getStatusCode().value() + ". Check LLM_BASE_URL, LLM_MODEL, and OPENAI_API_KEY.");
        return problemDetail;
    }

    @ExceptionHandler(RestClientException.class)
    public ProblemDetail handleOpenAiRequestFailure(RestClientException exception) {
        log.warn("LLM request failed", exception);

        ProblemDetail problemDetail = ProblemDetail.forStatus(HttpStatus.BAD_GATEWAY);
        problemDetail.setTitle("LLM request failed");
        problemDetail.setDetail("The application could not complete the model request.");
        return problemDetail;
    }

    @ExceptionHandler(OpenAiParseException.class)
    public ProblemDetail handleOpenAiParseFailure(OpenAiParseException exception) {
        log.warn("Model response parse failed", exception);

        ProblemDetail problemDetail = ProblemDetail.forStatus(HttpStatus.BAD_GATEWAY);
        problemDetail.setTitle("Model response parse failed");
        problemDetail.setDetail(exception.getMessage());
        return problemDetail;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpectedException(Exception exception) {
        log.error("Unexpected application error", exception);

        ProblemDetail problemDetail = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        problemDetail.setTitle("Unexpected application error");
        problemDetail.setDetail("The application could not complete the request.");
        return problemDetail;
    }
}
