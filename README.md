# Smart Café Experience

A commercial SaaS-grade contactless restaurant ordering platform. Customers scan a table-specific QR code, browse a media-rich menu, place orders with card/cash selectors, track preparation status in real-time, and play waiting-room games. Café owners manage kitchen tickets, configure menu catalog prices/stocks, print table QR placards, and review business revenue analytics via a protected admin dashboard.

---

## 🛠 Technology Stack

- **Frontend**: React 19 (JavaScript), React Router 7, Recharts, Lucide Icons, Canvas Confetti
- **Styling**: Tailwind CSS v4 (using the official `@tailwindcss/vite` build pipeline)
- **Backend**: Spring Boot 3.3.0 (Java 17), Spring Security 6 (Stateless JWT)
- **Real-time Synchronization**: Spring Boot WebSocket Broker (STOMP + SockJS Client) with REST polling fallback
- **Database & JPA**: MySQL 8.x, Spring Data JPA (Hibernate)

---

## 📂 Project Structure

```
project1/
├── backend/                  # Spring Boot Java Application
│   ├── src/main/java/com/smartcafe/backend/
│   │   ├── config/           # JWT security, WebSockets broker, and database seeding
│   │   ├── controller/       # Auth, Menus, Orders, Reviews, and Analytics REST Controllers
│   │   ├── dto/              # Auth credentials and order request mapping models
│   │   ├── entity/           # JPA database schema mappings (User, Order, MenuItem, etc.)
│   │   ├── repository/       # Data access interfaces with JPQL analytics aggregations
│   │   └── service/          # Business workflows & SimpMessagingTemplate WS broadcasts
│   ├── src/main/resources/   # Port configurations & MySQL datasource configurations
│   ├── pom.xml               # Maven configuration
│   └── mvnw.cmd              # Maven wrapper executable (Windows cmd)
└── frontend/                 # React.js SPA Application
    ├── src/
    │   ├── admin/            # Admin login, and dashboard (Overview, Orders, Menu, QR, Analytics)
    │   ├── context/          # Global providers (Cart items, Auth JWTs, Theme transitions)
    │   ├── pages/            # Customer screens (MenuPage, TrackingPage, GamesRoom, Journey, Feedback)
    │   ├── services/         # api.js and websocket.js communication clients
    │   ├── App.jsx           # Main page routing router layout
    │   ├── index.css         # Tailwind v4 import & custom HSL coffee theme extended rules
    │   └── main.jsx          # React renderer entrypoint
    ├── vite.config.js        # Vite + @tailwindcss/vite plugins configuration
    └── package.json          # Frontend packages
```

---

## 🔌 Database Schema (MySQL)

```sql
CREATE DATABASE IF NOT EXISTS smart_cafe;
USE smart_cafe;

-- Admin Users
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ROLE_ADMIN'
);

-- Catalog Items
CREATE TABLE IF NOT EXISTS menu_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(50) NOT NULL, -- Coffee, Tea, Snacks, Desserts, Combos
    image_url VARCHAR(255),
    available BOOLEAN DEFAULT TRUE,
    prep_time_minutes INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    table_number INT NOT NULL,
    status VARCHAR(30) NOT NULL, -- RECEIVED, PREPARING, READY, SERVED
    total_price DECIMAL(10, 2) NOT NULL,
    estimated_prep_time INT DEFAULT 15,
    payment_method VARCHAR(30) DEFAULT 'CASH_AT_COUNTER', -- CARD, UPI, CASH_AT_COUNTER
    payment_status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, COMPLETED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Order Items Details
CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    menu_item_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    price_at_order DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

-- Feedback opinions
CREATE TABLE IF NOT EXISTS feedback (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100) DEFAULT 'Anonymous',
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    suggestions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 Running locally

### 1. Database Setup
Create a local MySQL database named `smart_cafe`.
*Verify that port `3306` is open and your username/password is `root` / `root`. You can customize details in `backend/src/main/resources/application.properties` if needed.*

### 2. Launch the Backend
Navigate to the `backend/` directory and execute:
```powershell
./mvnw.cmd spring-boot:run
```
The console seeder will log:
- `>>> Database seeded: Admin user created (username: admin, password: admin123)`
- `>>> Database seeded: Default menu items added.`

The REST API and WebSockets endpoint will be listening on `http://localhost:8080`.

### 3. Launch the Frontend
Navigate to the `frontend/` directory and execute:
```powershell
npm run dev
```
Open `http://localhost:5173/` in your browser.

---

## 🔑 Default Credentials
- **Admin Username**: `admin`
- **Admin Password**: `admin123`

---

## 📦 Production Builds
- To compile the backend: `./mvnw.cmd clean package -DskipTests` (generates an executable JAR in `backend/target/`)
- To build the frontend bundle: `npm run build` (outputs optimized static files in `frontend/dist/`)
