package com.nishen.expense.infrastructure.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);
    private static final String REQUEST_ID_HEADER = "X-Request-Id";
    private static final String REQUEST_ID_MDC_KEY = "requestId";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String requestId = getOrCreateRequestId(request);
        long startedAt = System.currentTimeMillis();

        MDC.put(REQUEST_ID_MDC_KEY, requestId);
        response.setHeader(REQUEST_ID_HEADER, requestId);

        try {
            log.info("HTTP request started method={} path={} clientIp={}",
                    request.getMethod(),
                    request.getRequestURI(),
                    getClientIp(request));

            filterChain.doFilter(request, response);

            logCompletion(request, response, startedAt);
        } catch (IOException | ServletException | RuntimeException exception) {
            long durationMs = System.currentTimeMillis() - startedAt;
            log.error("HTTP request failed method={} path={} status={} durationMs={}",
                    request.getMethod(),
                    request.getRequestURI(),
                    response.getStatus(),
                    durationMs,
                    exception);
            throw exception;
        } finally {
            MDC.clear();
        }
    }

    private void logCompletion(HttpServletRequest request,
                               HttpServletResponse response,
                               long startedAt) {

        long durationMs = System.currentTimeMillis() - startedAt;
        int status = response.getStatus();

        if (status >= 500) {
            log.error("HTTP request completed method={} path={} status={} durationMs={}",
                    request.getMethod(),
                    request.getRequestURI(),
                    status,
                    durationMs);
        } else if (status >= 400) {
            log.warn("HTTP request completed method={} path={} status={} durationMs={}",
                    request.getMethod(),
                    request.getRequestURI(),
                    status,
                    durationMs);
        } else {
            log.info("HTTP request completed method={} path={} status={} durationMs={}",
                    request.getMethod(),
                    request.getRequestURI(),
                    status,
                    durationMs);
        }
    }

    private String getOrCreateRequestId(HttpServletRequest request) {
        String requestId = request.getHeader(REQUEST_ID_HEADER);

        if (requestId == null || requestId.isBlank()) {
            return UUID.randomUUID().toString();
        }

        return requestId;
    }

    private String getClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");

        if (forwardedFor == null || forwardedFor.isBlank()) {
            return request.getRemoteAddr();
        }

        return forwardedFor.split(",")[0].trim();
    }
}
