package com.smartcafe.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartcafe.backend.entity.Order;
import com.smartcafe.backend.entity.SystemSetting;
import com.smartcafe.backend.repository.OrderRepository;
import com.smartcafe.backend.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class WeeklyReportService {

    private final OrderRepository orderRepository;
    private final SystemSettingRepository settingRepository;
    private final ObjectMapper objectMapper;

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationStart() {
        System.out.println(">>> WeeklyReportService: Checking report status on application startup...");
        checkAndSendReport();
    }

    // Check every hour
    @Scheduled(cron = "0 0 * * * *")
    public void checkAndSendReportScheduled() {
        System.out.println(">>> WeeklyReportService: Checking report status on schedule...");
        checkAndSendReport();
    }

    public synchronized void checkAndSendReport() {
        try {
            String serviceId = settingRepository.findById("emailjs_service_id").map(SystemSetting::getValue).orElse(null);
            String templateId = settingRepository.findById("emailjs_template_id").map(SystemSetting::getValue).orElse(null);
            String publicKey = settingRepository.findById("emailjs_public_key").map(SystemSetting::getValue).orElse(null);
            String adminEmail = settingRepository.findById("admin_email").map(SystemSetting::getValue).orElse("admin@smartcafe.com");

            if (serviceId == null || serviceId.isBlank() ||
                templateId == null || templateId.isBlank() ||
                publicKey == null || publicKey.isBlank()) {
                System.out.println(">>> WeeklyReportService: EmailJS integrations are not fully configured. Skipping weekly report.");
                return;
            }

            String lastSentVal = settingRepository.findById("last_weekly_report_sent_at").map(SystemSetting::getValue).orElse(null);
            LocalDateTime now = LocalDateTime.now();
            boolean shouldSend = false;

            if (lastSentVal == null) {
                // If it is the first time, initialize it to 7 days ago so it sends immediately, and then save
                shouldSend = true;
                System.out.println(">>> WeeklyReportService: No record of previous sent report. Setting up for immediate send.");
            } else {
                try {
                    LocalDateTime lastSent = LocalDateTime.parse(lastSentVal);
                    long daysBetween = ChronoUnit.DAYS.between(lastSent, now);
                    if (daysBetween >= 7) {
                        shouldSend = true;
                        System.out.println(">>> WeeklyReportService: Report is due (last sent " + daysBetween + " days ago).");
                    } else {
                        System.out.println(">>> WeeklyReportService: Report not due yet. Last sent " + daysBetween + " days ago.");
                    }
                } catch (Exception e) {
                    shouldSend = true;
                    System.err.println(">>> WeeklyReportService: Could not parse last sent time. Defaulting to send: " + e.getMessage());
                }
            }

            if (shouldSend) {
                sendReport(serviceId, templateId, publicKey, adminEmail, now);
            }
        } catch (Exception e) {
            System.err.println(">>> WeeklyReportService: Error checking weekly report: " + e.getMessage());
        }
    }

    private void sendReport(String serviceId, String templateId, String publicKey, String adminEmail, LocalDateTime now) throws Exception {
        LocalDateTime weekAgo = now.minusDays(7);
        List<Order> orders = orderRepository.findByCreatedAtAfter(weekAgo);

        if (orders.isEmpty()) {
            System.out.println(">>> WeeklyReportService: No orders found in the last 7 days. Updating sent timestamp anyway to prevent loop.");
            saveLastSentTime(now);
            return;
        }

        double totalRevenue = 0.0;
        for (Order o : orders) {
            if (o.getPaymentStatus() != null && 
                ("COMPLETED".equalsIgnoreCase(o.getPaymentStatus()) || "PAID".equalsIgnoreCase(o.getPaymentStatus()))) {
                totalRevenue += (o.getTotalPrice() != null ? o.getTotalPrice() : 0.0);
            }
        }

        StringBuilder summary = new StringBuilder();
        summary.append("WEEKLY CAFE ORDERS SUMMARY REPORT (AUTO-GENERATED)\n");
        summary.append("Report Period: ").append(weekAgo.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")))
               .append(" to ").append(now.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))).append("\n");
        summary.append("=========================================================\n\n");
        summary.append(String.format("%-8s | %-8s | %-9s | %-10s | %-10s | %s\n", "Order ID", "Table", "Total", "Status", "Payment", "Date"));
        summary.append("---------------------------------------------------------\n");

        for (Order o : orders) {
            String dateStr = o.getCreatedAt() != null ? o.getCreatedAt().format(DateTimeFormatter.ofPattern("MMM dd")) : "";
            String idStr = "#" + o.getId();
            String tableStr = "T" + o.getTableNumber();
            String priceStr = String.format("₹%.2f", o.getTotalPrice());
            String statusStr = o.getStatus() != null ? o.getStatus() : "";
            String payStr = o.getPaymentStatus() != null ? o.getPaymentStatus() : "";

            summary.append(String.format("%-8s | %-8s | %-9s | %-10s | %-10s | %s\n", 
                    idStr, tableStr, priceStr, statusStr, payStr, dateStr));
        }
        summary.append("=========================================================\n");
        summary.append("Total Orders: ").append(orders.size()).append("\n");
        summary.append(String.format("Total Settled Revenue: ₹%.2f\n", totalRevenue));

        // Format EmailJS request body
        Map<String, Object> templateParams = new HashMap<>();
        templateParams.put("order_id", "Weekly Report (" + now.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) + ")");
        templateParams.put("table_number", "Weekly Report");
        templateParams.put("total_price", String.format("₹%.2f", totalRevenue));
        templateParams.put("payment_method", "Weekly Summary Report");
        templateParams.put("items_summary", summary.toString());
        templateParams.put("admin_email", adminEmail);
        templateParams.put("created_at", now.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));

        Map<String, Object> payload = new HashMap<>();
        payload.put("service_id", serviceId);
        payload.put("template_id", templateId);
        payload.put("user_id", publicKey);
        payload.put("template_params", templateParams);

        String jsonPayload = objectMapper.writeValueAsString(payload);

        HttpClient client = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .build();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.emailjs.com/api/v1.0/email/send"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();

        System.out.println(">>> WeeklyReportService: Dispatching weekly report to EmailJS...");
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            System.out.println(">>> WeeklyReportService: Weekly report sent successfully.");
            saveLastSentTime(now);
        } else {
            System.err.println(">>> WeeklyReportService: EmailJS failed with status: " + response.statusCode() + " response: " + response.body());
        }
    }

    private void saveLastSentTime(LocalDateTime time) {
        SystemSetting setting = settingRepository.findById("last_weekly_report_sent_at")
                .orElse(SystemSetting.builder().key("last_weekly_report_sent_at").build());
        setting.setValue(time.toString());
        settingRepository.save(setting);
        System.out.println(">>> WeeklyReportService: Updated last_weekly_report_sent_at to " + time);
    }
}
