package com.smartcafe.backend.service;

import com.smartcafe.backend.dto.OrderItemRequest;
import com.smartcafe.backend.dto.OrderRequest;
import com.smartcafe.backend.entity.Order;
import com.smartcafe.backend.entity.OrderItem;
import com.smartcafe.backend.entity.MenuItem;
import com.smartcafe.backend.repository.MenuItemRepository;
import com.smartcafe.backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final MenuItemRepository menuItemRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final GoogleSheetsService googleSheetsService;

    @Transactional
    public Order createOrder(OrderRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Order must contain at least one item.");
        }

        Order order = Order.builder()
                .tableNumber(request.getTableNumber())
                .status("RECEIVED")
                .paymentMethod(request.getPaymentMethod())
                .paymentStatus("PENDING")
                .build();

        double totalPrice = 0.0;
        int maxPrepTime = 0;
        List<OrderItem> orderItems = new ArrayList<>();

        for (OrderItemRequest itemReq : request.getItems()) {
            MenuItem menuItem = menuItemRepository.findById(itemReq.getMenuItemId())
                    .orElseThrow(() -> new RuntimeException("Menu item not found: " + itemReq.getMenuItemId()));
            
            if (!menuItem.isAvailable()) {
                throw new RuntimeException("Menu item " + menuItem.getName() + " is out of stock.");
            }

            double itemTotal = menuItem.getPrice() * itemReq.getQuantity();
            totalPrice += itemTotal;

            if (menuItem.getPrepTimeMinutes() > maxPrepTime) {
                maxPrepTime = menuItem.getPrepTimeMinutes();
            }

            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .menuItem(menuItem)
                    .quantity(itemReq.getQuantity())
                    .priceAtOrder(menuItem.getPrice())
                    .build();
            
            orderItems.add(orderItem);
        }

        order.setTotalPrice(totalPrice);
        // Prep time: max single item prep time + 2 minutes per extra item
        int calculatedPrepTime = maxPrepTime + (request.getItems().size() - 1) * 2;
        order.setEstimatedPrepTime(Math.max(calculatedPrepTime, 5)); // Minimum 5 minutes
        order.setOrderItems(orderItems);

        Order savedOrder = orderRepository.save(order);

        // Notify admins of a new order
        messagingTemplate.convertAndSend("/topic/orders", savedOrder);

        // Sync with Google Sheets
        googleSheetsService.syncOrder(savedOrder);

        return savedOrder;
    }

    @Transactional
    public Order updateOrderStatus(Long orderId, String status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));

        order.setStatus(status.toUpperCase());
        
        // If served, mark payment as completed
        if ("SERVED".equalsIgnoreCase(status)) {
            order.setPaymentStatus("COMPLETED");
        }

        Order updatedOrder = orderRepository.save(order);

        // Broadcast to customer tracking page
        messagingTemplate.convertAndSend("/topic/order/" + orderId, updatedOrder);
        
        // Broadcast update to Admin dashboard
        messagingTemplate.convertAndSend("/topic/orders", updatedOrder);

        // Sync updated details with Google Sheets
        googleSheetsService.syncOrder(updatedOrder);

        return updatedOrder;
    }

    @Transactional
    public Order updateOrderPrepTime(Long orderId, Integer minutes) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));

        order.setEstimatedPrepTime(minutes);
        Order updatedOrder = orderRepository.save(order);

        // Broadcast update to customer tracking page
        messagingTemplate.convertAndSend("/topic/order/" + orderId, updatedOrder);

        return updatedOrder;
    }

    @Transactional
    public Order cancelOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));

        if (!"RECEIVED".equalsIgnoreCase(order.getStatus())) {
            throw new IllegalStateException("Order is already being prepared or served and cannot be cancelled.");
        }

        order.setStatus("CANCELLED");
        order.setPaymentStatus("CANCELLED");

        Order updatedOrder = orderRepository.save(order);

        // Broadcast to customer tracking page
        messagingTemplate.convertAndSend("/topic/order/" + orderId, updatedOrder);
        
        // Broadcast update to Admin dashboard
        messagingTemplate.convertAndSend("/topic/orders", updatedOrder);

        // Sync updated details with Google Sheets
        googleSheetsService.syncOrder(updatedOrder);

        return updatedOrder;
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc();
    }

    public Order getOrderById(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
    }
}
