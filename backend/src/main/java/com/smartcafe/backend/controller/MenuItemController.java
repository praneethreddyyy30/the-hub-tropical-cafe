package com.smartcafe.backend.controller;

import com.smartcafe.backend.entity.MenuItem;
import com.smartcafe.backend.repository.MenuItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MenuItemController {

    private final MenuItemRepository menuItemRepository;

    // Public API: Get all menu items
    @GetMapping("/menu")
    public ResponseEntity<List<MenuItem>> getAllMenuItems() {
        return ResponseEntity.ok(menuItemRepository.findAll());
    }

    // Public API: Get items by category
    @GetMapping("/menu/category/{category}")
    public ResponseEntity<List<MenuItem>> getMenuItemsByCategory(@PathVariable String category) {
        return ResponseEntity.ok(menuItemRepository.findByCategory(category));
    }

    // Admin API: Create a menu item
    @PostMapping("/admin/menu")
    public ResponseEntity<MenuItem> createMenuItem(@RequestBody MenuItem menuItem) {
        return ResponseEntity.ok(menuItemRepository.save(menuItem));
    }

    // Admin API: Update a menu item
    @PutMapping("/admin/menu/{id}")
    public ResponseEntity<MenuItem> updateMenuItem(@PathVariable Long id, @RequestBody MenuItem menuItemDetails) {
        MenuItem menuItem = menuItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu item not found: " + id));

        menuItem.setName(menuItemDetails.getName());
        menuItem.setDescription(menuItemDetails.getDescription());
        menuItem.setPrice(menuItemDetails.getPrice());
        menuItem.setCategory(menuItemDetails.getCategory());
        menuItem.setImageUrl(menuItemDetails.getImageUrl());
        menuItem.setAvailable(menuItemDetails.isAvailable());
        menuItem.setPrepTimeMinutes(menuItemDetails.getPrepTimeMinutes());

        MenuItem updatedItem = menuItemRepository.save(menuItem);
        return ResponseEntity.ok(updatedItem);
    }

    // Admin API: Delete a menu item
    @DeleteMapping("/admin/menu/{id}")
    public ResponseEntity<?> deleteMenuItem(@PathVariable Long id) {
        MenuItem menuItem = menuItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu item not found: " + id));
        
        menuItemRepository.delete(menuItem);
        return ResponseEntity.ok().body("Menu item deleted successfully.");
    }

    // Admin API: Toggle item availability (In-stock / Out of stock)
    @PatchMapping("/admin/menu/{id}/toggle-availability")
    public ResponseEntity<MenuItem> toggleAvailability(@PathVariable Long id) {
        MenuItem menuItem = menuItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu item not found: " + id));
        
        menuItem.setAvailable(!menuItem.isAvailable());
        MenuItem updatedItem = menuItemRepository.save(menuItem);
        return ResponseEntity.ok(updatedItem);
    }
}
