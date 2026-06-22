package com.smartcafe.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderRequest {
    private Integer tableNumber;
    private List<OrderItemRequest> items;
    private String paymentMethod; // CARD, UPI, CASH_AT_COUNTER
}
