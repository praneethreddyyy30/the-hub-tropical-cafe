import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { getSavedOrderIds } from './utils/dateUtils';
import { 
  Coffee, Gamepad2, Compass, MessageSquare, ClipboardList, 
  Settings, Sun, Moon, Sparkles 
} from 'lucide-react';

// Context Providers
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// Pages
import MenuPage from './pages/MenuPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import MindGamesPage from './pages/MindGamesPage';
import CafeJourneyPage from './pages/CafeJourneyPage';
import FeedbackPage from './pages/FeedbackPage';

// Admin
import AdminLogin from './admin/AdminLogin';
import AdminDashboard from './admin/AdminDashboard';

// Layout wrapper to conditionalize headers/footers based on active route
function AppLayout() {
  const location = useLocation();
  const { darkMode, toggleTheme } = useTheme();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Retrieve table number from localstorage for header display
  const tableNum = localStorage.getItem('tableNumber');

  const [placedOrders, setPlacedOrders] = useState([]);

  useEffect(() => {
    const loadOrders = () => {
      const orders = getSavedOrderIds();
      setPlacedOrders(orders);
    };

    loadOrders();

    window.addEventListener('cafe_orders_updated', loadOrders);
    window.addEventListener('storage', loadOrders);

    return () => {
      window.removeEventListener('cafe_orders_updated', loadOrders);
      window.removeEventListener('storage', loadOrders);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. CUSTOMER NAVBAR (Only for non-admin pages) */}
      {!isAdminRoute && (
        <header className="sticky top-0 z-40 glass-nav shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
            
            {/* Logo Brand */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9.5 h-9.5 bg-cafe-wood text-white dark:bg-cafe-gold dark:text-cafe-charcoal rounded-xl flex items-center justify-center shadow-md">
                <Compass className="w-5 h-5 transition group-hover:rotate-45 text-cafe-cream dark:text-cafe-charcoal" />
              </div>
              <div className="text-left">
                <span className="font-serif text-sm font-extrabold tracking-tight block dark:text-white leading-none">The Hub</span>
                <span className="text-[9px] text-cafe-wood dark:text-cafe-gold font-bold block leading-none mt-0.5 uppercase tracking-wider">Tropical Cafe</span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-semibold">
              <Link to="/" className="px-3.5 py-2 rounded-lg text-gray-600 dark:text-gray-200 hover:text-cafe-wood dark:hover:text-cafe-gold transition">
                Menu
              </Link>
              <Link to="/games" className="px-3.5 py-2 rounded-lg text-gray-600 dark:text-gray-200 hover:text-cafe-wood dark:hover:text-cafe-gold transition flex items-center gap-1">
                <Gamepad2 className="w-4 h-4 text-cafe-gold" />
                <span>Waiting Games</span>
              </Link>
              <Link to="/journey" className="px-3.5 py-2 rounded-lg text-gray-600 dark:text-gray-200 hover:text-cafe-wood dark:hover:text-cafe-gold transition">
                Our Story
              </Link>
              <Link to="/feedback" className="px-3.5 py-2 rounded-lg text-gray-600 dark:text-gray-200 hover:text-cafe-wood dark:hover:text-cafe-gold transition">
                Feedback
              </Link>
              {placedOrders.length > 0 && (
                <Link to="/track" className="px-3.5 py-2 rounded-lg text-cafe-darkgold dark:text-cafe-gold hover:text-cafe-wood dark:hover:text-cafe-gold transition flex items-center gap-1">
                  <ClipboardList className="w-4 h-4" />
                  <span>My Orders</span>
                </Link>
              )}
            </nav>

            {/* Secondary actions: Table Badge, Theme, Admin Link */}
            <div className="flex items-center gap-3">
              {tableNum && (
                <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-cafe-gold/10 text-cafe-darkgold dark:text-cafe-gold border border-cafe-gold/20 rounded-full text-xs font-bold">
                  <Sparkles className="w-3 h-3 text-cafe-gold animate-pulse" />
                  <span>Table {tableNum}</span>
                </div>
              )}
              
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-xl border border-cafe-gold/15 hover:bg-cafe-gold/10 text-cafe-darkgold dark:text-cafe-gold transition"
                title="Toggle Theme"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <Link 
                to="/admin/dashboard" 
                className="p-2 rounded-xl border border-cafe-gold/15 text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition"
                title="Admin Portal"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* 2. PAGE CONTENT BODY */}
      <main className="flex-1 pb-16 md:pb-0">
        <Routes>
          <Route path="/" element={<MenuPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/track" element={<OrderTrackingPage />} />
          <Route path="/games" element={<MindGamesPage />} />
          <Route path="/journey" element={<CafeJourneyPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
      </main>

      {/* 3. CUSTOMER FOOTER (Only for non-admin pages) */}
      {!isAdminRoute && (
        <footer className="bg-white dark:bg-cafe-chocolate/10 border-t border-cafe-gold/25 py-8 mt-12 text-center text-xs text-gray-400 font-light space-y-3 pb-24 md:pb-8">
          <div className="flex justify-center items-center gap-1.5 text-cafe-wood dark:text-cafe-gold font-serif font-bold text-sm">
            <Compass className="w-4 h-4 animate-spin-slow" />
            <span>The Hub Tropical Cafe</span>
          </div>
          <p>© {new Date().getFullYear()} The Hub. Continental Kitchen & Specialty Coolers.</p>
          <div className="flex justify-center gap-4 text-gray-500 dark:text-gray-400 font-semibold">
            <Link to="/journey" className="hover:underline">About Us</Link>
            <span>•</span>
            <Link to="/feedback" className="hover:underline">Submit Review</Link>
            <span>•</span>
            <Link to="/admin/dashboard" className="hover:underline">Admin Console</Link>
          </div>
        </footer>
      )}

      {/* 4. MOBILE BOTTOM NAVIGATION (Only for non-admin pages) */}
      {!isAdminRoute && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-cafe-charcoal/95 backdrop-blur-md border-t border-cafe-gold/20 shadow-lg px-2 py-1.5 flex justify-around items-center h-16">
          <Link 
            to="/" 
            className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-bold transition-colors ${
              location.pathname === '/' || location.pathname === '/menu'
                ? 'text-cafe-wood dark:text-cafe-gold' 
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
          >
            <Compass className="w-5 h-5 mb-0.5" />
            <span>Menu</span>
          </Link>
          
          <Link 
            to="/games" 
            className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-bold transition-colors ${
              location.pathname === '/games'
                ? 'text-cafe-wood dark:text-cafe-gold' 
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
          >
            <Gamepad2 className="w-5 h-5 mb-0.5" />
            <span>Games</span>
          </Link>
          
          <Link 
            to="/journey" 
            className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-bold transition-colors ${
              location.pathname === '/journey'
                ? 'text-cafe-wood dark:text-cafe-gold' 
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
          >
            <Coffee className="w-5 h-5 mb-0.5" />
            <span>Our Story</span>
          </Link>
          
          <Link 
            to="/feedback" 
            className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-bold transition-colors ${
              location.pathname === '/feedback'
                ? 'text-cafe-wood dark:text-cafe-gold' 
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
          >
            <MessageSquare className="w-5 h-5 mb-0.5" />
            <span>Review</span>
          </Link>
          
          {placedOrders.length > 0 && (
            <Link 
              to="/track" 
              className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-bold transition-colors ${
                location.pathname === '/track'
                  ? 'text-cafe-wood dark:text-cafe-gold' 
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
              }`}
            >
              <ClipboardList className="w-5 h-5 mb-0.5" />
              <span>My Orders</span>
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <Router>
            <AppLayout />
          </Router>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
