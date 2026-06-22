package com.smartcafe.backend.config;

import com.smartcafe.backend.entity.MenuItem;
import com.smartcafe.backend.entity.SystemSetting;
import com.smartcafe.backend.entity.User;
import com.smartcafe.backend.repository.MenuItemRepository;
import com.smartcafe.backend.repository.SystemSettingRepository;
import com.smartcafe.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final MenuItemRepository menuItemRepository;
    private final SystemSettingRepository systemSettingRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // 1. Seed Admin User
        String envAdminPassword = System.getenv("ADMIN_PASSWORD");
        String targetPassword = (envAdminPassword != null && !envAdminPassword.isBlank()) ? envAdminPassword : "admin123";
        
        User admin = userRepository.findByUsername("admin").orElse(null);
        if (admin == null) {
            admin = User.builder()
                    .username("admin")
                    .password(passwordEncoder.encode(targetPassword))
                    .role("ROLE_ADMIN")
                    .build();
            userRepository.save(admin);
            System.out.println(">>> Database seeded: Admin user created.");
        } else {
            // Always ensure stored password matches targetPassword (env or default admin123)
            if (!passwordEncoder.matches(targetPassword, admin.getPassword())) {
                admin.setPassword(passwordEncoder.encode(targetPassword));
                userRepository.save(admin);
                System.out.println(">>> Database updated: Admin password reset/updated to match targetPassword.");
            }
        }

        // 2. Seed System Settings
        if (systemSettingRepository.count() == 0) {
            systemSettingRepository.save(new SystemSetting("google_sheets_webhook", "https://script.google.com/macros/s/YOUR_MOCK_URL/exec"));
            systemSettingRepository.save(new SystemSetting("emailjs_service_id", ""));
            systemSettingRepository.save(new SystemSetting("emailjs_template_id", ""));
            systemSettingRepository.save(new SystemSetting("emailjs_public_key", ""));
            systemSettingRepository.save(new SystemSetting("admin_email", "admin@smartcafe.com"));
            systemSettingRepository.save(new SystemSetting("upi_id", "smartcafe@ybl"));
            System.out.println(">>> Database seeded: System settings initialized.");
        } else {
            if (!systemSettingRepository.existsById("upi_id")) {
                systemSettingRepository.save(new SystemSetting("upi_id", "smartcafe@ybl"));
                System.out.println(">>> Database updated: System settings upi_id seeded.");
            }
        }

        // 3. Seed default Menu Items
        if (menuItemRepository.count() == 0) {
            List<MenuItem> defaultItems = Arrays.asList(
                // Coffee
                MenuItem.builder()
                        .name("Signature Hazelnut Frappé")
                        .description("Rich, blended espresso milkshake flavored with roasted hazelnuts and topped with whipped cream.")
                        .price(4.89)
                        .category("Coffee")
                        .imageUrl("https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80")
                        .available(true)
                        .prepTimeMinutes(4)
                        .build(),
                MenuItem.builder()
                        .name("Caramel Macchiato")
                        .description("Creamy espresso with vanilla-flavored syrup, milk, and a caramel drizzle topping.")
                        .price(4.99)
                        .category("Coffee")
                        .imageUrl("https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop&q=80")
                        .available(true)
                        .prepTimeMinutes(5)
                        .build(),
                MenuItem.builder()
                        .name("Vietnamese Iced Coffee")
                        .description("Strong drip espresso poured over ice and sweetened with condensed milk, a sweet tropical boost.")
                        .price(4.29)
                        .category("Coffee")
                        .imageUrl("https://images.unsplash.com/photo-1461016951428-745141573f4d?w=500&auto=format&fit=crop&q=80")
                        .available(true)
                        .prepTimeMinutes(3)
                        .build(),

                // Tea
                MenuItem.builder()
                        .name("Matcha Mint Cooler")
                        .description("Velvety stone-ground matcha whisked with fresh garden mint, ice, and organic oat milk.")
                        .price(4.79)
                        .category("Tea")
                        .imageUrl("https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=80")
                        .available(true)
                        .prepTimeMinutes(4)
                        .build(),
                MenuItem.builder()
                        .name("Hibiscus Iced Tea")
                        .description("Hand-steeped red hibiscus blossoms infused with lemongrass, elderberry, and a touch of raw honey.")
                        .price(3.49)
                        .category("Tea")
                        .imageUrl("https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80")
                        .available(true)
                        .prepTimeMinutes(3)
                        .build(),
                MenuItem.builder()
                        .name("Tropical Passion Fruit Mojito")
                        .description("Sparkling soda with fresh passion fruit pulp, crushed lime wedges, and wild mint leaves.")
                        .price(4.99)
                        .category("Tea")
                        .imageUrl("https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80")
                        .available(true)
                        .prepTimeMinutes(4)
                        .build(),

                // Snacks
                MenuItem.builder()
                        .name("The Hub Club Sandwich")
                        .description("Double-decker toasted bread loaded with grilled paneer, cucumber, tomatoes, house tropical pesto, and lettuce.")
                        .price(7.99)
                        .category("Snacks")
                        .imageUrl("https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=80")
                        .available(true)
                        .prepTimeMinutes(8)
                        .build(),
                MenuItem.builder()
                        .name("Avocado Sourdough Toast")
                        .description("Fresh crushed avocado, cherry tomatoes, and microgreens on toasted artisanal sourdough.")
                        .price(8.49)
                        .category("Snacks")
                        .imageUrl("https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=500&auto=format&fit=crop&q=80")
                        .available(true)
                        .prepTimeMinutes(6)
                        .build(),
                MenuItem.builder()
                        .name("Continental Peri Peri Fries")
                        .description("Golden shoestring fries tossed in spicy peri-peri seasoning and served with garlic mayo dip.")
                        .price(5.49)
                        .category("Snacks")
                        .imageUrl("https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80")
                        .available(true)
                        .prepTimeMinutes(5)
                        .build(),

                // Desserts
                MenuItem.builder()
                        .name("Double Chocolate Waffles")
                        .description("Belgian waffle loaded with hot chocolate fudge, milk chocolate chips, and premium vanilla ice cream.")
                        .price(6.99)
                        .category("Desserts")
                        .imageUrl("https://images.unsplash.com/photo-1562376502-6f769499c886?w=500&auto=format&fit=crop&q=80")
                        .available(true)
                        .prepTimeMinutes(7)
                        .build(),
                MenuItem.builder()
                        .name("Mango Panna Cotta")
                        .description("Creamy Italian custard infused with real Alphonso mango purée and topped with mint leaves.")
                        .price(5.99)
                        .category("Desserts")
                        .imageUrl("https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&auto=format&fit=crop&q=80")
                        .available(true)
                        .prepTimeMinutes(4)
                        .build(),

                // Combos
                MenuItem.builder()
                        .name("Tropical Sunrise Feast")
                        .description("Matcha Mint Cooler paired with our signature Avocado Sourdough Toast.")
                        .price(11.99)
                        .category("Combos")
                        .imageUrl("https://images.unsplash.com/photo-1498804103079-a6351b050096?w=500&auto=format&fit=crop&q=80")
                        .available(true)
                        .prepTimeMinutes(8)
                        .build(),
                MenuItem.builder()
                        .name("Sweet Escape Waffle Combo")
                        .description("Signature Hazelnut Frappé paired with our Double Chocolate Waffle.")
                        .price(10.49)
                        .category("Combos")
                        .imageUrl("https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&auto=format&fit=crop&q=80")
                        .available(true)
                        .prepTimeMinutes(9)
                        .build()
            );
            menuItemRepository.saveAll(defaultItems);
            System.out.println(">>> Database seeded: Default menu items added.");
        }
    }
}
