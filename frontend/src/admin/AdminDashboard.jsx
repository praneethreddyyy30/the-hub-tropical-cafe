import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, ShoppingCart, Clock, CheckCircle2, Coffee, 
  Trash2, Edit, Plus, ToggleLeft, ToggleRight, QrCode, 
  BarChart2, LogOut, Search, Printer, Download, Sparkles, Star, Compass, Mail
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { connectWebSocket, subscribeToOrders, disconnectWebSocket } from '../services/websocket';
import { parseBackendDate } from '../utils/dateUtils';
import { playAdminNotificationSound, playPaymentReceivedSound } from '../utils/soundUtils';

// Recharts components for Analytics
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell 
} from 'recharts';

export default function AdminDashboard() {
  const { logout, token, isAdmin, user, isAuthenticated } = useAuth();
  const { toggleTheme, darkMode } = useTheme();
  const navigate = useNavigate();

  // Navigation
  const [activeTab, setActiveTab] = useState('overview');

  // Telemetry & DB Data States
  const [overviewMetrics, setOverviewMetrics] = useState({
    totalOrders: 0, pendingOrders: 0, completedOrders: 0, totalRevenue: 0.0,
    popularItems: [], recentOrders: []
  });
  const [ordersList, setOrdersList] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [feedbackSummary, setFeedbackSummary] = useState({ averageRating: 0.0, totalReviews: 0, ratingDistribution: [] });
  const [feedbackList, setFeedbackList] = useState([]);
  const [salesAnalytics, setSalesAnalytics] = useState([]);

  // Filters & Searching
  const [orderQuery, setOrderQuery] = useState('');
  const [orderFilterStatus, setOrderFilterStatus] = useState('ALL');
  const [activeOnly, setActiveOnly] = useState(true);
  const [todayOnly, setTodayOnly] = useState(true);
  const [overviewTimeframe, setOverviewTimeframe] = useState('ALL');
  const [sendingReport, setSendingReport] = useState(false);
  const [menuQuery, setMenuQuery] = useState('');
  const [feedbackQuery, setFeedbackQuery] = useState('');
  const [feedbackFilterRating, setFeedbackFilterRating] = useState('ALL');

  // Modals & Forms
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null); // null means adding new
  const [menuForm, setMenuForm] = useState({
    name: '', description: '', price: '', category: 'Coffee', imageUrl: '', available: true, prepTimeMinutes: 10
  });

  // Integrations states
  const [integrationsForm, setIntegrationsForm] = useState({
    google_sheets_webhook: '',
    emailjs_service_id: '',
    emailjs_template_id: '',
    emailjs_public_key: '',
    admin_email: '',
    upi_id: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Table QR Code configs
  const [numTables, setNumTables] = useState(6);

  // Loading States
  const [loading, setLoading] = useState(true);

  // (playNewOrderSound has been clean migrated to soundUtils.js)

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, navigate]);

  // Lock staff to overview tab
  useEffect(() => {
    if (user?.role === 'ROLE_STAFF' && activeTab !== 'overview') {
      setActiveTab('overview');
    }
  }, [user, activeTab]);

  // Load Initial Dashboard Stats
  const loadDashboardData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      // Fetch overview metrics
      const ovData = await api.adminGetDashboardOverview();
      setOverviewMetrics(ovData);
      
      // Fetch all orders
      const ords = await api.adminGetOrders();
      setOrdersList(ords);

      // Only load admin data if user is not staff
      if (user?.role !== 'ROLE_STAFF') {
        // Fetch menu items
        const menu = await api.getMenu();
        setMenuItems(menu);

        // Fetch sales trend
        const sales = await api.adminGetSalesAnalytics();
        setSalesAnalytics(sales);

        // Fetch feedback stats
        const feeds = await api.adminGetFeedbackSummary();
        setFeedbackSummary(feeds);

        // Fetch all reviews for moderation
        const fList = await api.getFeedbackList();
        setFeedbackList(fList);

        // Fetch integration settings
        try {
          const settings = await api.getAdminSettings();
          setIntegrationsForm({
            google_sheets_webhook: settings.google_sheets_webhook || '',
            emailjs_service_id: settings.emailjs_service_id || '',
            emailjs_template_id: settings.emailjs_template_id || '',
            emailjs_public_key: settings.emailjs_public_key || '',
            admin_email: settings.admin_email || '',
            upi_id: settings.upi_id || ''
          });
        } catch (err) {
          console.error('Failed to load integration settings:', err);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Recalculate overview metrics dynamically in frontend based on selected timeframe
  useEffect(() => {
    if (!ordersList || ordersList.length === 0) return;

    const now = new Date();
    // Start of today (local time)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Start of this week (last 7 days)
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Start of this month (last 30 days)
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filtered = ordersList.filter(o => {
      if (!o.createdAt) return false;
      const orderDate = parseBackendDate(o.createdAt);
      if (!orderDate) return false;

      if (overviewTimeframe === 'TODAY') {
        return orderDate >= todayStart;
      } else if (overviewTimeframe === 'WEEK') {
        return orderDate >= weekStart;
      } else if (overviewTimeframe === 'MONTH') {
        return orderDate >= monthStart;
      }
      return true; // 'ALL'
    });

    let totalRevenue = 0;
    let pendingCount = 0;
    let completedCount = 0;
    const itemQtyMap = {};

    filtered.forEach(o => {
      if (o.status !== 'SERVED' && o.status !== 'CANCELLED') {
        pendingCount++;
      }
      if (o.status === 'SERVED') {
        completedCount++;
      }
      if (o.paymentStatus && ['COMPLETED', 'PAID'].includes(o.paymentStatus.toUpperCase())) {
        totalRevenue += o.totalPrice || 0;
      }

      if (o.orderItems) {
        o.orderItems.forEach(item => {
          if (item.menuItem && item.menuItem.name) {
            const name = item.menuItem.name;
            itemQtyMap[name] = (itemQtyMap[name] || 0) + (item.quantity || 0);
          }
        });
      }
    });

    const popularItems = Object.keys(itemQtyMap).map(name => ({
      itemName: name,
      totalQty: itemQtyMap[name]
    })).sort((a, b) => b.totalQty - a.totalQty);

    setOverviewMetrics({
      totalOrders: filtered.length,
      pendingOrders: pendingCount,
      completedOrders: completedCount,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      popularItems: popularItems.slice(0, 5),
      recentOrders: filtered.slice(0, 5)
    });
  }, [ordersList, overviewTimeframe]);

  useEffect(() => {
    if (token) {
      loadDashboardData();
      
      // Hook up WebSockets
      connectWebSocket(() => {
        subscribeToOrders((updatedOrder) => {
          // Play notification chime on any new order (Received status)
          if (updatedOrder.status === 'RECEIVED') {
            playAdminNotificationSound();
          }
          
          // Check if payment was just completed
          setOrdersList(prevList => {
            const existingOrder = prevList.find(o => o.id === updatedOrder.id);
            if (
              existingOrder && 
              existingOrder.paymentStatus !== 'COMPLETED' && 
              updatedOrder.paymentStatus === 'COMPLETED'
            ) {
              playPaymentReceivedSound();
            }
            return prevList;
          });

          // Hot reload orders and overview
          api.adminGetOrders().then(ords => setOrdersList(ords));
          api.adminGetDashboardOverview().then(ov => setOverviewMetrics(ov));
        });
      });
    }

    return () => {
      disconnectWebSocket();
    };
  }, [token, user]);

  // Helpers for Weekly Excel/CSV Report
  const getWeeklyOrders = () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return ordersList.filter(o => {
      if (!o.createdAt) return false;
      const orderDate = parseBackendDate(o.createdAt);
      return orderDate && orderDate >= weekAgo;
    });
  };

  const generateCSVString = (orders) => {
    const headers = ["Order ID", "Table", "Total Price", "Status", "Payment Method", "Payment Status", "Date"];
    const rows = orders.map(o => {
      const orderDate = o.createdAt ? parseBackendDate(o.createdAt).toLocaleString() : "";
      return [
        o.id,
        o.tableNumber,
        `₹${o.totalPrice.toFixed(2)}`,
        o.status,
        o.paymentMethod,
        o.paymentStatus,
        `"${orderDate}"`
      ].join(",");
    });
    return [headers.join(","), ...rows].join("\n");
  };

  const handleDownloadWeeklyReport = () => {
    const weeklyOrders = getWeeklyOrders();
    if (weeklyOrders.length === 0) {
      alert("No orders placed this week to generate a report.");
      return;
    }
    const csvContent = generateCSVString(weeklyOrders);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `weekly_sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEmailWeeklyReport = async () => {
    const { emailjs_service_id, emailjs_template_id, emailjs_public_key, admin_email } = integrationsForm;
    if (!emailjs_service_id || !emailjs_template_id || !emailjs_public_key) {
      alert('Please configure your EmailJS settings in the Integrations tab before dispatching reports.');
      return;
    }

    const weeklyOrders = getWeeklyOrders();
    if (weeklyOrders.length === 0) {
      alert("No orders placed this week to report.");
      return;
    }

    setSendingReport(true);
    try {
      const totalRevenue = weeklyOrders.reduce((sum, o) => {
        if (o.paymentStatus && ['COMPLETED', 'PAID'].includes(o.paymentStatus.toUpperCase())) {
          return sum + (o.totalPrice || 0);
        }
        return sum;
      }, 0);

      let summary = "WEEKLY CAFE ORDERS SUMMARY REPORT\n";
      summary += `Report Generated: ${new Date().toLocaleString()}\n`;
      summary += "=========================================================\n\n";
      summary += "Order ID | Table | Total   | Status    | Payment   | Date\n";
      summary += "---------------------------------------------------------\n";
      
      weeklyOrders.forEach(o => {
        const dateStr = o.createdAt ? parseBackendDate(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "";
        const idPad = `#${o.id}`.padEnd(8);
        const tablePad = `T${o.tableNumber}`.padEnd(8);
        const pricePad = `₹${o.totalPrice.toFixed(2)}`.padEnd(9);
        const statusPad = o.status.padEnd(10);
        const payPad = o.paymentStatus.padEnd(10);
        summary += `${idPad} | ${tablePad} | ${pricePad} | ${statusPad} | ${payPad} | ${dateStr}\n`;
      });
      summary += "=========================================================\n";
      summary += `Total Orders: ${weeklyOrders.length}\n`;
      summary += `Total Settled Revenue: ₹${totalRevenue.toFixed(2)}\n`;

      const emailPayload = {
        service_id: emailjs_service_id,
        template_id: emailjs_template_id,
        user_id: emailjs_public_key,
        template_params: {
          order_id: `Weekly Report (${new Date().toLocaleDateString()})`,
          table_number: "Weekly Report",
          total_price: `₹${totalRevenue.toFixed(2)}`,
          payment_method: "Weekly Summary Report",
          items_summary: summary,
          admin_email: admin_email || "admin@smartcafe.com",
          created_at: new Date().toLocaleString()
        }
      };

      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload)
      });

      if (res.ok) {
        alert('Weekly report summary emailed successfully via EmailJS!');
      } else {
        const errText = await res.text();
        throw new Error(errText || 'EmailJS rejected the dispatch');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send weekly report email: ' + err.message);
    } finally {
      setSendingReport(false);
    }
  };

  // Handle Order Status advancement
  const handleUpdateStatus = async (id, currentStatus) => {
    let nextStatus = 'RECEIVED';
    if (currentStatus === 'RECEIVED') nextStatus = 'PREPARING';
    else if (currentStatus === 'PREPARING') nextStatus = 'READY';
    else if (currentStatus === 'READY') nextStatus = 'SERVED';
    else return;

    try {
      await api.adminUpdateOrderStatus(id, nextStatus);
      // Hot updates
      setOrdersList(prev => prev.map(o => o.id === id ? { ...o, status: nextStatus } : o));
      const updatedOverview = await api.adminGetDashboardOverview();
      setOverviewMetrics(updatedOverview);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Order Prep Time override
  const handleUpdatePrepTime = async (id, minutes) => {
    try {
      await api.adminUpdateOrderPrepTime(id, minutes);
      setOrdersList(prev => prev.map(o => o.id === id ? { ...o, estimatedPrepTime: minutes } : o));
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle item in/out of stock
  const handleToggleStock = async (id) => {
    try {
      const updatedItem = await api.adminToggleAvailability(id);
      setMenuItems(prev => prev.map(item => item.id === id ? updatedItem : item));
    } catch (err) {
      console.error(err);
    }
  };

  // Menu Form Handlers
  const openMenuForm = (item = null) => {
    if (item) {
      setSelectedMenuItem(item);
      setMenuForm({
        name: item.name,
        description: item.description || '',
        price: item.price,
        category: item.category,
        imageUrl: item.imageUrl || '',
        available: item.available,
        prepTimeMinutes: item.prepTimeMinutes
      });
    } else {
      setSelectedMenuItem(null);
      setMenuForm({
        name: '', description: '', price: '', category: 'Coffee', imageUrl: '', available: true, prepTimeMinutes: 10
      });
    }
    setMenuModalOpen(true);
  };

  const handleMenuSubmit = async (e) => {
    e.preventDefault();
    try {
      const itemData = {
        ...menuForm,
        price: parseFloat(menuForm.price),
        prepTimeMinutes: parseInt(menuForm.prepTimeMinutes, 10)
      };

      if (selectedMenuItem) {
        // Update
        const result = await api.adminUpdateMenuItem(selectedMenuItem.id, itemData);
        setMenuItems(prev => prev.map(m => m.id === selectedMenuItem.id ? result : m));
      } else {
        // Create
        const result = await api.adminCreateMenuItem(itemData);
        setMenuItems(prev => [result, ...prev]);
      }
      setMenuModalOpen(false);
      loadDashboardData();
    } catch (err) {
      alert('Failed to save menu item.');
      console.error(err);
    }
  };

  const handleDeleteMenuItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await api.adminDeleteMenuItem(id);
      setMenuItems(prev => prev.filter(m => m.id !== id));
      loadDashboardData();
    } catch (err) {
      alert('Failed to delete item.');
      console.error(err);
    }
  };

  const handleDeleteFeedback = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await api.adminDeleteFeedback(id);
      setFeedbackList(prev => prev.filter(f => f.id !== id));
      const feeds = await api.adminGetFeedbackSummary();
      setFeedbackSummary(feeds);
    } catch (err) {
      alert('Failed to delete review.');
      console.error(err);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const updatedSettings = await api.updateAdminSettings(integrationsForm);
      setIntegrationsForm(updatedSettings);
      alert('Integration settings saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newAdminPassword) {
      alert('Password cannot be empty.');
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      alert('Passwords do not match.');
      return;
    }
    try {
      setChangingPassword(true);
      await api.adminChangePassword(newAdminPassword);
      alert('Admin password updated successfully!');
      setNewAdminPassword('');
      setConfirmAdminPassword('');
    } catch (err) {
      console.error(err);
      alert('Failed to update password: ' + err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!integrationsForm.google_sheets_webhook) {
      alert('Please enter a Webhook URL first.');
      return;
    }
    try {
      setTestingWebhook(true);
      const testPayload = {
        orderId: 0,
        tableNumber: 0,
        totalPrice: 0.00,
        status: 'TEST',
        paymentMethod: 'TEST_CONNECTION',
        paymentStatus: 'TEST_COMPLETED',
        timestamp: new Date().toISOString()
      };
      
      await fetch(integrationsForm.google_sheets_webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
        mode: 'no-cors'
      });
      
      alert('Test webhook payload dispatched to Google Sheets! Verify your sheet.');
    } catch (err) {
      console.error(err);
      alert('Test failed: ' + err.message);
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleTestEmailJS = async () => {
    const { emailjs_service_id, emailjs_template_id, emailjs_public_key, admin_email } = integrationsForm;
    if (!emailjs_service_id || !emailjs_template_id || !emailjs_public_key) {
      alert('Please fill out all EmailJS configuration fields (Service ID, Template ID, and Public Key) before testing.');
      return;
    }
    
    try {
      setTestingEmail(true);
      const emailPayload = {
        service_id: emailjs_service_id,
        template_id: emailjs_template_id,
        user_id: emailjs_public_key,
        template_params: {
          order_id: 0,
          table_number: 0,
          total_price: '₹0.00',
          payment_method: 'TEST_CONNECTION',
          items_summary: 'Test Email Notification from The Hub Admin Console',
          admin_email: admin_email || 'admin@smartcafe.com',
          created_at: new Date().toLocaleTimeString()
        }
      };

      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload)
      });

      if (res.ok) {
        alert('Test email successfully dispatched via EmailJS! Check your inbox.');
      } else {
        const errText = await res.text();
        throw new Error(errText || 'Failed to dispatch email');
      }
    } catch (err) {
      console.error(err);
      alert('EmailJS Test failed: ' + err.message);
    } finally {
      setTestingEmail(false);
    }
  };

  // Helpers
  const formatStatus = (status) => {
    switch (status) {
      case 'RECEIVED': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400';
      case 'PREPARING': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400';
      case 'READY': return 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400';
      case 'SERVED': return 'bg-gray-100 text-gray-700 dark:bg-cafe-chocolate/40 dark:text-gray-400';
      case 'CANCELLED': return 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  // Filters for Orders
  const filteredOrders = ordersList.filter(o => {
    const matchesSearch = o.id.toString().includes(orderQuery) || o.tableNumber.toString().includes(orderQuery);
    const matchesFilter = orderFilterStatus === 'ALL' || o.status === orderFilterStatus;
    const matchesActive = !activeOnly || !['SERVED', 'CANCELLED'].includes(o.status.toUpperCase());
    
    let matchesToday = true;
    if (todayOnly && o.createdAt) {
      const orderDate = parseBackendDate(o.createdAt);
      if (orderDate) {
        const today = new Date();
        matchesToday = orderDate.getDate() === today.getDate() &&
                       orderDate.getMonth() === today.getMonth() &&
                       orderDate.getFullYear() === today.getFullYear();
      }
    }
    
    return matchesSearch && matchesFilter && matchesActive && matchesToday;
  });

  // Filters for Menu
  const filteredMenuItems = menuItems.filter(m => {
    return m.name.toLowerCase().includes(menuQuery.toLowerCase()) || 
           m.category.toLowerCase().includes(menuQuery.toLowerCase());
  });

  // Filters for Feedback
  const filteredFeedback = feedbackList.filter(f => {
    const matchesSearch = (f.customerName && f.customerName.toLowerCase().includes(feedbackQuery.toLowerCase())) || 
                          (f.suggestions && f.suggestions.toLowerCase().includes(feedbackQuery.toLowerCase()));
    const matchesFilter = feedbackFilterRating === 'ALL' || f.rating.toString() === feedbackFilterRating;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-cafe-cream dark:bg-cafe-charcoal transition-colors">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-white dark:bg-cafe-chocolate/10 border-r border-cafe-gold/20 flex flex-col justify-between">
        <div>
          {/* Logo Brand */}
          <div className="p-6 border-b border-cafe-gold/20 flex items-center gap-2">
            <Compass className="w-6 h-6 text-cafe-gold animate-bounce-subtle" />
            <div>
              <h2 className="font-serif text-lg font-bold dark:text-white leading-tight">The Hub</h2>
              <span className="text-[10px] text-cafe-gold uppercase font-bold tracking-widest">Console Admin</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-2">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'orders', label: 'Order Mgmt', icon: ShoppingCart },
              { id: 'menu', label: 'Menu Mgmt', icon: Coffee },
              { id: 'qr', label: 'QR Codes', icon: QrCode },
              { id: 'analytics', label: 'Analytics', icon: BarChart2 },
              { id: 'reviews', label: 'Reviews', icon: Star },
              { id: 'integrations', label: 'Integrations', icon: Sparkles }
            ].filter(tab => {
              if (user?.role === 'ROLE_STAFF') {
                return tab.id === 'overview';
              }
              return true;
            }).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-cafe-wood text-white dark:bg-cafe-gold dark:text-cafe-chocolate shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-cafe-chocolate/30'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-cafe-gold/20 space-y-2">
          <button 
            onClick={toggleTheme}
            className="w-full py-2.5 bg-gray-100 dark:bg-cafe-chocolate/30 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold hover:bg-cafe-gold/10 transition"
          >
            Toggle Mode ({darkMode ? 'Light' : 'Dark'})
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {loading && ordersList.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-[50vh]">
            <div className="w-10 h-10 border-4 border-cafe-gold border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400 dark:text-gray-500 text-sm animate-pulse">Syncing telemetry data...</p>
          </div>
        ) : (
          <>
            {/* ==========================================================
               TAB 1: OVERVIEW
               ========================================================== */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="font-serif text-2xl md:text-3xl font-bold dark:text-white mb-1.5">Dashboard Overview</h2>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-light">Real-time café operations and financial metrics.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Timeframe:</span>
                    <select
                      value={overviewTimeframe}
                      onChange={(e) => setOverviewTimeframe(e.target.value)}
                      className="px-3 py-2 bg-white dark:bg-cafe-chocolate/20 border border-cafe-gold/25 rounded-xl text-xs text-gray-800 dark:text-white focus:outline-none"
                    >
                      <option value="TODAY" className="bg-white dark:bg-cafe-charcoal text-gray-800 dark:text-white">Today</option>
                      <option value="WEEK" className="bg-white dark:bg-cafe-charcoal text-gray-800 dark:text-white">This Week (7d)</option>
                      <option value="MONTH" className="bg-white dark:bg-cafe-charcoal text-gray-800 dark:text-white">This Month (30d)</option>
                      <option value="ALL" className="bg-white dark:bg-cafe-charcoal text-gray-800 dark:text-white">Lifetime</option>
                    </select>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Revenue', value: `₹${overviewMetrics.totalRevenue.toFixed(2)}`, icon: TrendingUp, color: 'text-green-500 bg-green-500/10' },
                    { label: 'Total Orders', value: overviewMetrics.totalOrders, icon: ShoppingCart, color: 'text-blue-500 bg-blue-500/10' },
                    { label: 'Pending Orders', value: overviewMetrics.pendingOrders, icon: Clock, color: 'text-yellow-500 bg-yellow-500/10' },
                    { label: 'Completed Orders', value: overviewMetrics.completedOrders, icon: CheckCircle2, color: 'text-green-600 bg-green-600/10' }
                  ].map((card, i) => (
                    <div key={i} className="bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/20 p-5 rounded-2xl shadow-xs">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{card.label}</span>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color}`}>
                          <card.icon className="w-4.5 h-4.5" />
                        </div>
                      </div>
                      <h3 className="font-serif text-2xl font-extrabold text-gray-800 dark:text-white">{card.value}</h3>
                    </div>
                  ))}
                </div>



                {/* Grid details */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Recent Orders List */}
                  <div className="lg:col-span-8 bg-white dark:bg-cafe-chocolate/5 border border-cafe-gold/15 p-6 rounded-2xl shadow-xs">
                    <h3 className="font-serif text-lg font-bold dark:text-white mb-4">Recent Incoming Orders</h3>
                    {overviewMetrics.recentOrders.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500 py-6 text-center">No orders placed yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-gray-400 border-b border-gray-100 dark:border-cafe-wood/20 pb-2">
                              <th className="pb-3 font-semibold">Order</th>
                              <th className="pb-3 font-semibold">Table</th>
                              <th className="pb-3 font-semibold">Total Price</th>
                              <th className="pb-3 font-semibold">Status</th>
                              <th className="pb-3 font-semibold text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 dark:divide-cafe-wood/10">
                            {overviewMetrics.recentOrders.map((ord) => (
                              <tr key={ord.id} className="text-gray-600 dark:text-gray-300">
                                <td className="py-3.5 font-bold dark:text-white">#{ord.id}</td>
                                <td className="py-3.5">Table {ord.tableNumber}</td>
                                <td className="py-3.5">
                                  <div className="font-bold text-gray-800 dark:text-white">₹{ord.totalPrice.toFixed(2)}</div>
                                  <div className="text-[9px] text-cafe-darkgold dark:text-cafe-gold font-bold mt-0.5">{ord.paymentMethod}</div>
                                </td>
                                <td className="py-3.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${formatStatus(ord.status)}`}>
                                    {ord.status}
                                  </span>
                                </td>
                                <td className="py-3.5 text-right">
                                  {ord.status !== 'SERVED' && ord.status !== 'CANCELLED' ? (
                                    <button
                                      onClick={() => handleUpdateStatus(ord.id, ord.status)}
                                      className="px-3 py-1 bg-cafe-wood text-white dark:bg-cafe-gold dark:text-cafe-chocolate rounded font-semibold text-[10px] hover:scale-102 transition"
                                    >
                                      Advance
                                    </button>
                                  ) : (
                                    <span className={`font-semibold text-[10px] ${ord.status === 'CANCELLED' ? 'text-red-500' : 'text-green-500'}`}>
                                      {ord.status === 'CANCELLED' ? 'Cancelled' : 'Complete'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Bestselling list */}
                  <div className="lg:col-span-4 bg-white dark:bg-cafe-chocolate/5 border border-cafe-gold/15 p-6 rounded-2xl shadow-xs">
                    <h3 className="font-serif text-lg font-bold dark:text-white mb-4">Bestselling Items</h3>
                    {overviewMetrics.popularItems.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500 py-6 text-center">No sales recorded.</p>
                    ) : (
                      <div className="space-y-4">
                        {overviewMetrics.popularItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm font-light">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-cafe-gold">{idx + 1}.</span>
                              <span className="text-gray-800 dark:text-gray-200 font-medium">{item.itemName}</span>
                            </div>
                            <span className="text-xs bg-cafe-gold/10 text-cafe-darkgold dark:text-cafe-gold px-2 py-0.5 rounded font-bold">
                              {item.totalQty} sold
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ==========================================================
               TAB 2: ORDER MANAGEMENT
               ========================================================== */}
            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="font-serif text-2xl md:text-3xl font-bold dark:text-white mb-1.5">Order Management</h2>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-light">Process kitchen tickets and update customer screens in real-time.</p>
                  </div>
                  
                  {/* Filters Bar */}
                  <div className="flex flex-wrap gap-2.5 items-center">
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-gray-400" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search ID/Table..."
                        value={orderQuery}
                        onChange={(e) => setOrderQuery(e.target.value)}
                        className="pl-9 pr-3 py-2 bg-white dark:bg-cafe-chocolate/20 border border-cafe-gold/25 rounded-xl text-xs text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none"
                      />
                    </div>
                    <select
                      value={orderFilterStatus}
                      onChange={(e) => setOrderFilterStatus(e.target.value)}
                      className="px-3 py-2 bg-white dark:bg-cafe-chocolate/20 border border-cafe-gold/25 rounded-xl text-xs text-gray-800 dark:text-white focus:outline-none"
                    >
                      <option value="ALL" className="bg-white dark:bg-cafe-charcoal text-gray-800 dark:text-white">All Statuses</option>
                      <option value="RECEIVED" className="bg-white dark:bg-cafe-charcoal text-gray-800 dark:text-white">Received</option>
                      <option value="PREPARING" className="bg-white dark:bg-cafe-charcoal text-gray-800 dark:text-white">Preparing</option>
                      <option value="READY" className="bg-white dark:bg-cafe-charcoal text-gray-800 dark:text-white">Ready</option>
                      <option value="SERVED" className="bg-white dark:bg-cafe-charcoal text-gray-800 dark:text-white">Served</option>
                    </select>

                    <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 font-semibold cursor-pointer select-none border border-cafe-gold/25 px-3 py-2 rounded-xl bg-white dark:bg-cafe-chocolate/20">
                      <input
                        type="checkbox"
                        checked={activeOnly}
                        onChange={(e) => setActiveOnly(e.target.checked)}
                        className="rounded border-gray-300 text-cafe-wood focus:ring-cafe-gold h-3.5 w-3.5"
                      />
                      <span>Active Only</span>
                    </label>

                    <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 font-semibold cursor-pointer select-none border border-cafe-gold/25 px-3 py-2 rounded-xl bg-white dark:bg-cafe-chocolate/20">
                      <input
                        type="checkbox"
                        checked={todayOnly}
                        onChange={(e) => setTodayOnly(e.target.checked)}
                        className="rounded border-gray-300 text-cafe-wood focus:ring-cafe-gold h-3.5 w-3.5"
                      />
                      <span>Today Only</span>
                    </label>
                  </div>
                </div>

                {/* Orders Grid */}
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-cafe-chocolate/5 border rounded-2xl">
                    <p className="text-gray-400 dark:text-gray-500 text-sm font-light">No matching orders found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredOrders.map((ord) => (
                      <div 
                        key={ord.id} 
                        className="bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/20 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
                      >
                        <div>
                          {/* Card Header */}
                          <div className="flex justify-between items-start mb-3 border-b border-gray-100 dark:border-cafe-wood/20 pb-3">
                            <div>
                              <h4 className="font-bold text-sm text-gray-800 dark:text-white">Order #{ord.id}</h4>
                              <span className="text-[10px] text-gray-400 font-light">Table {ord.tableNumber}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${formatStatus(ord.status)}`}>
                              {ord.status}
                            </span>
                          </div>

                          {/* Items List */}
                          <div className="space-y-2 mb-4 max-h-[140px] overflow-y-auto pr-1">
                            {ord.orderItems && ord.orderItems.map((item) => (
                              <div key={item.id} className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
                                <span>x{item.quantity} {item.menuItem?.name}</span>
                                <span>₹{(item.priceAtOrder * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Card Footer controls */}
                        <div className="border-t border-gray-100 dark:border-cafe-wood/20 pt-3 mt-3 space-y-3.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-xs text-gray-400 font-light">Total: <strong className="text-gray-800 dark:text-white">₹{ord.totalPrice.toFixed(2)}</strong></div>
                              <div className="text-[10px] text-cafe-darkgold dark:text-cafe-gold font-bold mt-1">{ord.paymentMethod}</div>
                            </div>
                            
                            {/* Prep time setter */}
                            {ord.status !== 'SERVED' && ord.status !== 'CANCELLED' && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                <input
                                  type="number"
                                  min="1"
                                  value={ord.estimatedPrepTime}
                                  onChange={(e) => handleUpdatePrepTime(ord.id, parseInt(e.target.value, 10))}
                                  className="w-10 px-1 py-0.5 border border-gray-200 dark:border-cafe-wood/40 dark:bg-cafe-charcoal rounded text-[10px] text-center font-bold text-gray-700 dark:text-white"
                                />
                                <span className="text-[10px] text-gray-400 font-light">min</span>
                              </div>
                            )}
                          </div>

                          {/* Quick Advance Button */}
                          {ord.status !== 'SERVED' && ord.status !== 'CANCELLED' ? (
                            <button
                              onClick={() => handleUpdateStatus(ord.id, ord.status)}
                              className="w-full py-2 bg-cafe-wood hover:bg-cafe-chocolate dark:bg-cafe-gold dark:text-cafe-chocolate dark:hover:bg-cafe-darkgold dark:hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                              <span>Advance to:</span>
                              <strong className="uppercase">
                                {ord.status === 'RECEIVED' ? 'Preparing' : ord.status === 'PREPARING' ? 'Ready' : 'Served'}
                              </strong>
                            </button>
                          ) : (
                            <div className={`py-2 rounded-xl text-center text-xs font-bold ${
                              ord.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500' : 'bg-gray-100 dark:bg-cafe-chocolate/20 text-green-500'
                            }`}>
                              {ord.status === 'CANCELLED' ? 'Cancelled' : 'Completed & Served'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==========================================================
               TAB 3: MENU MANAGEMENT
               ========================================================== */}
            {activeTab === 'menu' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="font-serif text-2xl md:text-3xl font-bold dark:text-white mb-1.5">Menu Management</h2>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-light">Add, edit, or delete items and toggle stock availability instantly.</p>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-gray-400" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search menu items..."
                        value={menuQuery}
                        onChange={(e) => setMenuQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-cafe-chocolate/20 border border-cafe-gold/25 rounded-xl text-xs text-gray-800 dark:text-white focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => openMenuForm()}
                      className="px-4 py-2 bg-cafe-wood text-white dark:bg-cafe-gold dark:text-cafe-chocolate hover:scale-102 font-bold rounded-xl text-xs transition flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Item</span>
                    </button>
                  </div>
                </div>

                {/* Menu items list */}
                {filteredMenuItems.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-cafe-chocolate/5 border rounded-2xl">
                    <p className="text-gray-400 dark:text-gray-500 text-sm font-light">No menu items found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMenuItems.map((item) => (
                      <div 
                        key={item.id} 
                        className="bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/20 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between"
                      >
                        <div className="relative h-44 overflow-hidden bg-cafe-chocolate/5 border-b border-cafe-gold/10">
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          <span className="absolute top-3 right-3 px-2 py-0.5 bg-black/75 rounded text-[10px] text-cafe-gold font-bold uppercase tracking-wider">
                            {item.category}
                          </span>
                        </div>
                        <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start">
                              <h4 className="font-serif font-bold text-base text-gray-800 dark:text-white">{item.name}</h4>
                              <span className="font-bold text-cafe-wood dark:text-cafe-gold">₹{item.price.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 mt-1 font-light">{item.description}</p>
                          </div>
                          
                          <div className="border-t border-gray-50 dark:border-cafe-wood/10 pt-3 mt-3 flex items-center justify-between">
                            {/* Stock Toggle */}
                            <button
                              onClick={() => handleToggleStock(item.id)}
                              className="flex items-center gap-1 text-[11px] font-bold text-gray-500 dark:text-gray-300"
                            >
                              {item.available ? (
                                <>
                                  <ToggleRight className="w-5 h-5 text-green-500" />
                                  <span>In Stock</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="w-5 h-5 text-gray-400" />
                                  <span className="text-red-500">Out of Stock</span>
                                </>
                              )}
                            </button>

                            {/* Actions */}
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => openMenuForm(item)}
                                className="p-2 bg-gray-100 hover:bg-cafe-gold/20 text-gray-700 dark:bg-cafe-charcoal dark:text-gray-300 rounded-lg transition"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteMenuItem(item.id)}
                                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==========================================================
               TAB 4: QR CODE MANAGEMENT
               ========================================================== */}
            {activeTab === 'qr' && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-2xl md:text-3xl font-bold dark:text-white mb-1.5">QR Code Management</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-light">Generate QR tags for tables. Link them directly to storefront routing.</p>
                </div>

                {/* Configurations Card */}
                <div className="bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/25 p-5 rounded-2xl shadow-xs flex flex-col md:flex-row gap-6 items-center justify-between">
                  <div className="space-y-1 max-w-md text-center md:text-left">
                    <h3 className="font-serif text-sm font-bold dark:text-white">Active Tables Configuration</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-light">Set the amount of physical tables in your coffee shop. Generates `/menu?table=X` endpoints.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-gray-400 uppercase">Tables Count</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={numTables}
                      onChange={(e) => setNumTables(Math.max(1, parseInt(e.target.value, 10)))}
                      className="w-16 px-2 py-1.5 border border-cafe-gold/20 dark:bg-cafe-charcoal rounded-xl text-sm font-bold text-center dark:text-white"
                    />
                  </div>
                </div>

                {/* Grid of table QR cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {Array.from({ length: numTables }).map((_, i) => {
                    const tableId = i + 1;
                    const url = `${window.location.origin}/?table=${tableId}`;
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
                    
                    return (
                      <div 
                        key={tableId} 
                        className="bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/15 p-5 rounded-2xl text-center shadow-xs flex flex-col items-center justify-between"
                      >
                        <h4 className="font-serif font-bold text-sm dark:text-white mb-2">Table #{tableId}</h4>
                        
                        {/* QR Box */}
                        <div className="w-36 h-36 bg-gray-50 dark:bg-white p-2.5 rounded-xl border border-gray-100 flex items-center justify-center mb-3">
                          <img src={qrUrl} alt={`Table ${tableId} QR`} className="w-full h-full object-contain" />
                        </div>
                        
                        <p className="text-[10px] text-gray-400 font-light break-all mb-4 px-2 select-all hover:text-cafe-gold">
                          /menu?table={tableId}
                        </p>

                        <div className="flex gap-2 w-full">
                          <button
                            onClick={() => window.open(url, '_blank')}
                            className="flex-1 py-1.5 border border-cafe-gold/30 rounded-lg text-[10px] font-semibold text-cafe-wood dark:text-cafe-gold hover:bg-cafe-gold/10 transition"
                          >
                            Open Link
                          </button>
                          <a
                            href={qrUrl}
                            download={`table_${tableId}_qr.png`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-cafe-gold/15 border border-cafe-gold/30 rounded-lg text-cafe-darkgold dark:text-cafe-gold hover:bg-cafe-gold hover:text-white transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ==========================================================
               TAB 5: ANALYTICS & CHARTS
               ========================================================== */}
            {activeTab === 'analytics' && (
              <div className="space-y-8">
                <div>
                  <h2 className="font-serif text-2xl md:text-3xl font-bold dark:text-white mb-1.5">Business Intelligence & Analytics</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-light">Visual trend charts powered by local customer order telemetry.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Daily Sales Line Chart */}
                  <div className="lg:col-span-8 bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/15 p-5 rounded-2xl shadow-xs">
                    <h3 className="font-serif text-sm font-bold dark:text-white mb-4">Revenue Trend (Daily Sales)</h3>
                    <div className="h-72">
                      {salesAnalytics.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500 py-24 text-center">Inconclusive trend data.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={salesAnalytics}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#C5A880" opacity={0.15} />
                            <XAxis dataKey="date" stroke="#888" fontSize={10} tickFormatter={(str) => str ? str.split('T')[0] : ''} />
                            <YAxis stroke="#888" fontSize={10} />
                            <Tooltip contentStyle={{ background: darkMode ? '#1A1613' : '#FFF', borderColor: '#C5A880', fontSize: 11 }} />
                            <Line type="monotone" dataKey="totalSales" name="Sales (₹)" stroke="#A37F55" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Feedback summary rating doughnut */}
                  <div className="lg:col-span-4 bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/15 p-5 rounded-2xl shadow-xs text-center flex flex-col justify-between">
                    <div>
                      <h3 className="font-serif text-sm font-bold dark:text-white mb-2">Guest Review Score</h3>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-light">Feedback sentiment averages</p>
                    </div>

                    <div className="py-6">
                      <div className="text-5xl font-extrabold text-cafe-wood dark:text-cafe-gold font-serif mb-1.5 flex items-center justify-center gap-1.5">
                        <span>{feedbackSummary.averageRating.toFixed(1)}</span>
                        <Star className="w-8 h-8 text-cafe-gold fill-cafe-gold" />
                      </div>
                      <p className="text-xs text-gray-400 font-light">Based on {feedbackSummary.totalReviews} guest reviews</p>
                    </div>

                    {/* Simple distribution bar */}
                    <div className="space-y-1.5 border-t border-gray-50 dark:border-cafe-wood/10 pt-4 text-xs font-light text-left text-gray-400">
                      {feedbackSummary.ratingDistribution.map((dist, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span>{dist.rating} Stars</span>
                          <span className="font-bold text-gray-800 dark:text-gray-200">{dist.count} reviews</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Popular items chart */}
                <div className="bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/15 p-5 rounded-2xl shadow-xs">
                  <h3 className="font-serif text-sm font-bold dark:text-white mb-4">Menu Items Popularity (Quantity Sold)</h3>
                  <div className="h-64">
                    {overviewMetrics.popularItems.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500 py-20 text-center">Bestseller logs empty.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={overviewMetrics.popularItems}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#C5A880" opacity={0.15} />
                          <XAxis dataKey="itemName" stroke="#888" fontSize={9} />
                          <YAxis stroke="#888" fontSize={10} />
                          <Tooltip contentStyle={{ background: darkMode ? '#1A1613' : '#FFF', borderColor: '#C5A880', fontSize: 11 }} />
                          <Bar dataKey="totalQty" name="Qty Sold" fill="#C5A880" radius={[10, 10, 0, 0]}>
                            {overviewMetrics.popularItems.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#4E3629' : '#C5A880'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ==========================================================
               TAB: REVIEW MODERATION & MANAGEMENT
               ========================================================== */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="font-serif text-2xl md:text-3xl font-bold dark:text-white mb-1.5">Review Moderation</h2>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-light">Moderate customer reviews and feedback comments submitted on the storefront.</p>
                  </div>
                  
                  {/* Filters Bar */}
                  <div className="flex flex-wrap gap-2.5 items-center w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-gray-400" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search reviewer or comment..."
                        value={feedbackQuery}
                        onChange={(e) => setFeedbackQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-cafe-chocolate/20 border border-cafe-gold/25 rounded-xl text-xs text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none"
                      />
                    </div>
                    <select
                      value={feedbackFilterRating}
                      onChange={(e) => setFeedbackFilterRating(e.target.value)}
                      className="px-3 py-2 bg-white dark:bg-cafe-chocolate/20 border border-cafe-gold/25 rounded-xl text-xs text-gray-800 dark:text-white focus:outline-none"
                    >
                      <option value="ALL" className="bg-white dark:bg-cafe-charcoal text-gray-800 dark:text-white">All Ratings</option>
                      <option value="5" className="bg-white dark:bg-cafe-charcoal text-gray-800 dark:text-white">5 Stars</option>
                      <option value="4" className="bg-white dark:bg-cafe-charcoal text-gray-800 dark:text-white">4 Stars</option>
                      <option value="3" className="bg-white dark:bg-cafe-charcoal text-gray-800 dark:text-white">3 Stars</option>
                      <option value="2" className="bg-white dark:bg-cafe-charcoal text-gray-800 dark:text-white">2 Stars</option>
                      <option value="1" className="bg-white dark:bg-cafe-charcoal text-gray-800 dark:text-white">1 Star</option>
                    </select>
                  </div>
                </div>

                {/* Reviews Grid */}
                {filteredFeedback.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-cafe-chocolate/5 border rounded-2xl">
                    <p className="text-gray-400 dark:text-gray-500 text-sm font-light">No matching reviews found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredFeedback.map((rev) => (
                      <div 
                        key={rev.id} 
                        className="bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/20 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
                      >
                        <div>
                          {/* Card Header */}
                          <div className="flex justify-between items-start mb-3 border-b border-gray-100 dark:border-cafe-wood/20 pb-3">
                            <div>
                              <h4 className="font-bold text-sm text-gray-800 dark:text-white">{rev.customerName}</h4>
                              <span className="text-[10px] text-gray-400 font-light">
                                {parseBackendDate(rev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            
                            {/* Stars Display */}
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star 
                                  key={s} 
                                  className={`w-3.5 h-3.5 ${
                                    s <= rev.rating 
                                      ? 'text-cafe-gold fill-cafe-gold' 
                                      : 'text-gray-100 dark:text-cafe-wood/20'
                                  }`} 
                                />
                              ))}
                            </div>
                          </div>

                          {/* Review Text */}
                          <p className="text-xs text-gray-600 dark:text-gray-300 font-light leading-relaxed mb-4 whitespace-pre-wrap">
                            "{rev.suggestions}"
                          </p>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="border-t border-gray-100 dark:border-cafe-wood/20 pt-3 mt-3 flex justify-end">
                          <button
                            onClick={() => handleDeleteFeedback(rev.id)}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5"
                            title="Delete this review"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Review</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==========================================================
               TAB 6: INTEGRATIONS & API CONFIGURATION
               ========================================================== */}
            {activeTab === 'integrations' && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-2xl md:text-3xl font-bold dark:text-white mb-1.5">Integrations & API Settings</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-light">Link dynamic storefront triggers to external channels and logging ledgers.</p>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-8">
                  {/* Google Sheets Integration Card */}
                  <div className="bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/25 p-6 rounded-2xl shadow-xs space-y-4">
                    <div className="flex justify-between items-start border-b border-gray-100 dark:border-cafe-wood/20 pb-3">
                      <div>
                        <h3 className="font-serif text-base font-bold dark:text-white">Google Sheets Real-Time Sync</h3>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-light mt-0.5">Stream order telemetry directly into a Google Spreadsheet.</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800/15 rounded font-bold uppercase tracking-wider">
                        Async Push
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Google Apps Script Web App Webhook URL</label>
                      <input
                        type="url"
                        placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                        value={integrationsForm.google_sheets_webhook}
                        onChange={(e) => setIntegrationsForm({ ...integrationsForm, google_sheets_webhook: e.target.value })}
                        className="w-full px-3.5 py-3 border border-cafe-gold/20 bg-white dark:bg-cafe-charcoal rounded-xl text-xs text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none"
                      />
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-normal font-light">
                        Whenever an order is created or updated, the backend fires a POST request containing JSON order details. 
                        Use our default Apps Script payload parser on your destination sheet.
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleTestWebhook}
                        disabled={testingWebhook}
                        className="px-4 py-2 border border-cafe-gold/30 hover:bg-cafe-wood/5 dark:hover:bg-cafe-gold/5 text-cafe-wood dark:text-cafe-gold rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        {testingWebhook ? (
                          <div className="w-3.5 h-3.5 border border-cafe-wood dark:border-cafe-gold border-t-transparent rounded-full animate-spin" />
                        ) : 'Send Test Webhook'}
                      </button>
                    </div>
                  </div>

                  {/* EmailJS Client Alerts Card */}
                  <div className="bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/25 p-6 rounded-2xl shadow-xs space-y-4">
                    <div className="flex justify-between items-start border-b border-gray-100 dark:border-cafe-wood/20 pb-3">
                      <div>
                        <h3 className="font-serif text-base font-bold dark:text-white">EmailJS Admin Notifications</h3>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-light mt-0.5">Send instant transactional order emails to the café administrator.</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/15 rounded font-bold uppercase tracking-wider">
                        Client-Side
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Service ID */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">EmailJS Service ID</label>
                        <input
                          type="text"
                          placeholder="e.g. service_g8x9n1"
                          value={integrationsForm.emailjs_service_id}
                          onChange={(e) => setIntegrationsForm({ ...integrationsForm, emailjs_service_id: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-cafe-gold/20 bg-white dark:bg-cafe-charcoal rounded-xl text-xs text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none"
                        />
                      </div>
                      {/* Template ID */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">EmailJS Template ID</label>
                        <input
                          type="text"
                          placeholder="e.g. template_r1j9k2"
                          value={integrationsForm.emailjs_template_id}
                          onChange={(e) => setIntegrationsForm({ ...integrationsForm, emailjs_template_id: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-cafe-gold/20 bg-white dark:bg-cafe-charcoal rounded-xl text-xs text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Public Key */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">EmailJS Public Key</label>
                        <input
                          type="text"
                          placeholder="e.g. user_qK9jH2oL..."
                          value={integrationsForm.emailjs_public_key}
                          onChange={(e) => setIntegrationsForm({ ...integrationsForm, emailjs_public_key: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-cafe-gold/20 bg-white dark:bg-cafe-charcoal rounded-xl text-xs text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none"
                        />
                      </div>
                      {/* Admin Email */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Admin Recipient Email</label>
                        <input
                          type="email"
                          placeholder="admin@smartcafe.com"
                          value={integrationsForm.admin_email}
                          onChange={(e) => setIntegrationsForm({ ...integrationsForm, admin_email: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-cafe-gold/20 bg-white dark:bg-cafe-charcoal rounded-xl text-xs text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleTestEmailJS}
                        disabled={testingEmail}
                        className="px-4 py-2 border border-cafe-gold/30 hover:bg-cafe-wood/5 dark:hover:bg-cafe-gold/5 text-cafe-wood dark:text-cafe-gold rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        {testingEmail ? (
                          <div className="w-3.5 h-3.5 border border-cafe-wood dark:border-cafe-gold border-t-transparent rounded-full animate-spin" />
                        ) : 'Send Test Email'}
                      </button>
                    </div>

                    <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-normal font-light">
                      Emails are triggered asynchronously from the customer terminal on successful validation of checkout. 
                      Configuring this eliminates the need for complex server SMTP setups.
                    </p>
                  </div>

                  {/* UPI QR Payment Configuration Card */}
                  <div className="bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/25 p-6 rounded-2xl shadow-xs space-y-4">
                    <div className="flex justify-between items-start border-b border-gray-150 dark:border-cafe-wood/20 pb-3">
                      <div>
                        <h3 className="font-serif text-base font-bold dark:text-white">UPI QR Code Payment Settings</h3>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-light mt-0.5">Configure your UPI ID to receive direct payments from customer checkout scans.</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-cafe-gold/10 text-cafe-darkgold dark:text-cafe-gold border border-cafe-gold/25 rounded font-bold uppercase tracking-wider">
                        Direct P2P
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Merchant / Owner UPI ID (VPA)</label>
                      <input
                        type="text"
                        placeholder="cafeowner@okaxis"
                        value={integrationsForm.upi_id || ''}
                        onChange={(e) => setIntegrationsForm({ ...integrationsForm, upi_id: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-cafe-gold/20 bg-white dark:bg-cafe-charcoal rounded-xl text-xs text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none"
                      />
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-normal font-light">
                        Enter your active personal or business UPI Virtual Payment Address (VPA). The customer's tracking and ordering screen will generate a dynamic QR code embedded with the exact bill total.
                      </p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="px-6 py-3 bg-cafe-wood hover:bg-cafe-chocolate dark:bg-cafe-gold dark:text-cafe-chocolate dark:hover:bg-cafe-darkgold dark:hover:text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-md"
                    >
                      {savingSettings ? (
                        <div className="w-3.5 h-3.5 border-2 border-white dark:border-cafe-chocolate border-t-transparent rounded-full animate-spin" />
                      ) : 'Save Integration Settings'}
                    </button>
                  </div>
                </form>

                {/* Admin Password Update Card */}
                <div className="bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/25 p-6 rounded-2xl shadow-xs space-y-4 mt-6">
                  <div className="flex justify-between items-start border-b border-gray-100 dark:border-cafe-wood/20 pb-3">
                    <div>
                      <h3 className="font-serif text-base font-bold dark:text-white">Admin Credentials Security</h3>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-light mt-0.5">Change the password of the local admin account.</p>
                    </div>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* New Password */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">New Admin Password</label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-cafe-gold/20 bg-white dark:bg-cafe-charcoal rounded-xl text-xs text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none"
                        />
                      </div>
                      {/* Confirm Password */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Confirm New Password</label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={confirmAdminPassword}
                          onChange={(e) => setConfirmAdminPassword(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-cafe-gold/20 bg-white dark:bg-cafe-charcoal rounded-xl text-xs text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={changingPassword}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm"
                      >
                        {changingPassword ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : 'Update Admin Password'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Menu Form Modal (Add/Edit Menu Item) */}
      {menuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-cafe-charcoal rounded-2xl border border-cafe-gold/30 p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="font-serif text-lg font-bold dark:text-white mb-4">
              {selectedMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}
            </h3>
            
            <form onSubmit={handleMenuSubmit} className="space-y-4 text-xs font-semibold text-gray-500">
              {/* Name */}
              <div>
                <label className="text-gray-400 block mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={menuForm.name}
                  onChange={(e) => setMenuForm({...menuForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-cafe-gold/25 bg-white dark:bg-cafe-charcoal rounded-xl text-gray-800 dark:text-white focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-gray-400 block mb-1">Description</label>
                <textarea
                  rows="3"
                  value={menuForm.description}
                  onChange={(e) => setMenuForm({...menuForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-cafe-gold/25 bg-white dark:bg-cafe-charcoal rounded-xl text-gray-800 dark:text-white focus:outline-none"
                />
              </div>

              {/* Price & Prep time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={menuForm.price}
                    onChange={(e) => setMenuForm({...menuForm, price: e.target.value})}
                    className="w-full px-3 py-2 border border-cafe-gold/25 bg-white dark:bg-cafe-charcoal rounded-xl text-gray-800 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Prep Time (mins)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={menuForm.prepTimeMinutes}
                    onChange={(e) => setMenuForm({...menuForm, prepTimeMinutes: e.target.value})}
                    className="w-full px-3 py-2 border border-cafe-gold/25 bg-white dark:bg-cafe-charcoal rounded-xl text-gray-800 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Category & Image URL */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 block mb-1">Category</label>
                  <select
                    value={menuForm.category}
                    onChange={(e) => setMenuForm({...menuForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-cafe-gold/25 bg-white dark:bg-cafe-charcoal rounded-xl text-gray-800 dark:text-white focus:outline-none"
                  >
                    <option value="Coffee" className="bg-white dark:bg-cafe-charcoal text-gray-800 dark:text-white">Coffee</option>
                    <option value="Tea" className="bg-white dark:bg-cafe-charcoal text-gray-800 dark:text-white">Tea</option>
                    <option value="Snacks" className="bg-white dark:bg-cafe-charcoal text-gray-800 dark:text-white">Snacks</option>
                    <option value="Desserts" className="bg-white dark:bg-cafe-charcoal text-gray-800 dark:text-white">Desserts</option>
                    <option value="Combos" className="bg-white dark:bg-cafe-charcoal text-gray-800 dark:text-white">Combos</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Image URL</label>
                  <input
                    type="text"
                    value={menuForm.imageUrl}
                    onChange={(e) => setMenuForm({...menuForm, imageUrl: e.target.value})}
                    className="w-full px-3 py-2 border border-cafe-gold/25 bg-white dark:bg-cafe-charcoal rounded-xl text-gray-800 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-cafe-wood/20">
                <button
                  type="button"
                  onClick={() => setMenuModalOpen(false)}
                  className="flex-1 py-2.5 border border-cafe-gold/20 rounded-xl text-gray-500 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-cafe-wood text-white dark:bg-cafe-gold dark:text-cafe-chocolate hover:bg-cafe-chocolate dark:hover:bg-cafe-darkgold dark:hover:text-white rounded-xl font-bold transition"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
