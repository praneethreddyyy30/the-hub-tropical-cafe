package com.smartcafe.backend.controller;

import com.smartcafe.backend.dto.OrderRequest;
import com.smartcafe.backend.entity.Order;
import com.smartcafe.backend.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class OrderController {

    private final OrderService orderService;

    // Public API: Place a new order
    @PostMapping("/orders/create")
    public ResponseEntity<Order> placeOrder(@RequestBody OrderRequest orderRequest) {
        Order createdOrder = orderService.createOrder(orderRequest);
        return ResponseEntity.ok(createdOrder);
    }

    // Public API: Cancel order
    @PostMapping("/orders/{id}/cancel")
    public ResponseEntity<Order> cancelOrder(@PathVariable Long id) {
        Order cancelledOrder = orderService.cancelOrder(id);
        return ResponseEntity.ok(cancelledOrder);
    }

    // Public API: Track order details
    @GetMapping("/orders/track/{id}")
    public ResponseEntity<Order> trackOrder(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    // Admin API: Get all orders
    @GetMapping("/admin/orders")
    public ResponseEntity<List<Order>> getAllOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    // Admin API: Update order status
    @PutMapping("/admin/orders/{id}/status")
    public ResponseEntity<Order> updateOrderStatus(@PathVariable Long id, @RequestParam String status) {
        Order updatedOrder = orderService.updateOrderStatus(id, status);
        return ResponseEntity.ok(updatedOrder);
    }

    // Admin API: Update order estimated prep time
    @PutMapping("/admin/orders/{id}/prep-time")
    public ResponseEntity<Order> updateOrderPrepTime(@PathVariable Long id, @RequestParam Integer minutes) {
        Order updatedOrder = orderService.updateOrderPrepTime(id, minutes);
        return ResponseEntity.ok(updatedOrder);
    }
}
