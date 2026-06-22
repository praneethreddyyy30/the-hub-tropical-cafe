package com.smartcafe.backend.repository;

import com.smartcafe.backend.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Map;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    
    List<Order> findByStatus(String status);
    
    List<Order> findByTableNumber(Integer tableNumber);
    
    List<Order> findAllByOrderByCreatedAtDesc();

    @Query("SELECT COUNT(o) FROM Order o WHERE o.status != 'SERVED'")
    long countPendingOrders();

    @Query("SELECT COUNT(o) FROM Order o WHERE o.status = 'SERVED'")
    long countCompletedOrders();

    @Query("SELECT SUM(o.totalPrice) FROM Order o WHERE o.paymentStatus = 'COMPLETED'")
    Double calculateTotalRevenue();

    // JPQL query to retrieve the most popular menu items
    @Query("SELECT oi.menuItem.name as itemName, SUM(oi.quantity) as totalQty " +
           "FROM OrderItem oi " +
           "GROUP BY oi.menuItem.id, oi.menuItem.name " +
           "ORDER BY totalQty DESC")
    List<Map<String, Object>> findPopularItems();

    // JPQL queries for daily/weekly/monthly revenue analytics
    @Query("SELECT CAST(o.createdAt AS date) as date, SUM(o.totalPrice) as totalSales " +
           "FROM Order o " +
           "GROUP BY CAST(o.createdAt AS date) " +
           "ORDER BY CAST(o.createdAt AS date) ASC")
    List<Map<String, Object>> getDailySales();
}
