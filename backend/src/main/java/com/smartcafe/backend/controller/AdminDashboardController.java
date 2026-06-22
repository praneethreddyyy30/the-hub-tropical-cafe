package com.smartcafe.backend.controller;

import com.smartcafe.backend.entity.Order;
import com.smartcafe.backend.entity.User;
import com.smartcafe.backend.repository.FeedbackRepository;
import com.smartcafe.backend.repository.OrderRepository;
import com.smartcafe.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminDashboardController {

    private final OrderRepository orderRepository;
    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> request) {
        String newPassword = request.get("newPassword");
        if (newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body("Password cannot be empty.");
        }
        User admin = userRepository.findByUsername("admin")
                .orElseThrow(() -> new RuntimeException("Admin user not found"));
        admin.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(admin);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Password changed successfully.");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getOverview() {
        long totalOrders = orderRepository.count();
        long pendingOrders = orderRepository.countPendingOrders();
        long completedOrders = orderRepository.countCompletedOrders();
        Double totalRevenue = orderRepository.calculateTotalRevenue();
        if (totalRevenue == null) totalRevenue = 0.0;

        List<Map<String, Object>> popularItems = orderRepository.findPopularItems();
        if (popularItems.size() > 5) {
            popularItems = popularItems.subList(0, 5);
        }

        // Get 5 most recent orders for quick dashboard view
        List<Order> recentOrders = orderRepository.findAll(
                PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt"))
        ).getContent();

        Map<String, Object> metrics = new HashMap<>();
        metrics.put("totalOrders", totalOrders);
        metrics.put("pendingOrders", pendingOrders);
        metrics.put("completedOrders", completedOrders);
        metrics.put("totalRevenue", Math.round(totalRevenue * 100.0) / 100.0);
        metrics.put("popularItems", popularItems);
        metrics.put("recentOrders", recentOrders);

        return ResponseEntity.ok(metrics);
    }

    @GetMapping("/analytics/sales")
    public ResponseEntity<List<Map<String, Object>>> getSalesAnalytics() {
        return ResponseEntity.ok(orderRepository.getDailySales());
    }

    @GetMapping("/analytics/popular")
    public ResponseEntity<List<Map<String, Object>>> getPopularItemsAnalytics() {
        return ResponseEntity.ok(orderRepository.findPopularItems());
    }
}
