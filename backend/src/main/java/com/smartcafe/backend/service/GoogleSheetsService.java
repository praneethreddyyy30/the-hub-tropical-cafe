package com.smartcafe.backend.service;

import com.smartcafe.backend.entity.Order;
import com.smartcafe.backend.entity.SystemSetting;
import com.smartcafe.backend.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
public class GoogleSheetsService {

    private final SystemSettingRepository settingRepository;

    /**
     * Pushes order telemetry data asynchronously to the configured Google Sheet Apps Script webhook.
     */
    public void syncOrder(Order order) {
        String webhookUrl = settingRepository.findById("google_sheets_webhook")
                .map(SystemSetting::getValue)
                .orElse(null);

        if (webhookUrl == null || webhookUrl.isBlank() || webhookUrl.contains("YOUR_MOCK_URL")) {
            // Webhook is not configured or is using default placeholder
            return;
        }

        CompletableFuture.runAsync(() -> {
            try {
                // Escape payment method details (e.g. UTR codes) for clean JSON mapping
                String sanitizedPaymentMethod = order.getPaymentMethod() != null 
                        ? order.getPaymentMethod().replace("\"", "\\\"") 
                        : "CASH_AT_COUNTER";

                String jsonPayload = String.format(
                    "{\"orderId\":%d,\"tableNumber\":%d,\"totalPrice\":%.2f,\"status\":\"%s\",\"paymentMethod\":\"%s\",\"paymentStatus\":\"%s\",\"timestamp\":\"%s\"}",
                    order.getId(),
                    order.getTableNumber(),
                    order.getTotalPrice(),
                    order.getStatus(),
                    sanitizedPaymentMethod,
                    order.getPaymentStatus(),
                    order.getCreatedAt() != null ? order.getCreatedAt().toString() : java.time.LocalDateTime.now().toString()
                );

                HttpClient client = HttpClient.newBuilder()
                        .followRedirects(HttpClient.Redirect.ALWAYS)
                        .build();
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(webhookUrl))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                        .build();

                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                System.out.println(">>> Google Sheets Sync Success. Webhook Status: " + response.statusCode());
            } catch (Exception e) {
                System.err.println(">>> Google Sheets Sync Failure: " + e.getMessage());
            }
        });
    }
}
