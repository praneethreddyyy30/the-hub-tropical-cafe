import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, ShoppingBag, Plus, Minus, Trash2, X, Clock, 
  Check, Sparkles, CreditCard, DollarSign, ArrowRight, Compass, Star 
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { parseBackendDate, saveOrderToHistory } from '../utils/dateUtils';

export default function MenuPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const { 
    cartItems, addToCart, removeFromCart, updateQuantity, 
    clearCart, cartTotal, cartCount 
  } = useCart();
  const { darkMode } = useTheme();

  const [menuItems, setMenuItems] = useState([]);
  const [reviewsList, setReviewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [tableNumber, setTableNumber] = useState(null);
  
  // UI states
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH_AT_COUNTER');
  const [orderConfirm, setOrderConfirm] = useState(null); // stores order result
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [tempTableNum, setTempTableNum] = useState('');
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [skipUtr, setSkipUtr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publicSettings, setPublicSettings] = useState(null);

  // Fetch system settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await api.getPublicSettings();
        setPublicSettings(settings);
      } catch (err) {
        console.error('Failed to load public settings:', err);
      }
    };
    fetchSettings();
  }, []);

  // 1. Detect Table Number
  useEffect(() => {
    const tableParam = searchParams.get('table');
    if (tableParam) {
      const num = parseInt(tableParam, 10);
      if (!isNaN(num) && num > 0) {
        setTableNumber(num);
        localStorage.setItem('tableNumber', num);
      }
    } else {
      const savedTable = localStorage.getItem('tableNumber');
      if (savedTable) {
        setTableNumber(parseInt(savedTable, 10));
      } else {
        // If no table is specified, open a modal prompting to select one
        setTableModalOpen(true);
      }
    }
  }, [searchParams]);

  // 2. Fetch Menu
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setLoading(true);
        const data = await api.getMenu();
        setMenuItems(data);
      } catch (err) {
        console.error('Error loading menu:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  // Fetch customer reviews (filtered for top reviews >= 4 stars)
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await api.getFeedbackList();
        const topReviews = data.filter(r => r.rating >= 4).slice(0, 6);
        setReviewsList(topReviews);
      } catch (err) {
        console.error('Error loading reviews:', err);
      }
    };
    fetchReviews();
  }, []);

  const categories = ['All', 'Coffee', 'Tea', 'Snacks', 'Desserts', 'Combos'];

  // 3. Filters
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sendEmailJSAlert = async (order) => {
    try {
      const settings = publicSettings;
      if (!settings) {
        console.info('Public settings not loaded yet. Skipping notification email.');
        return;
      }
      const serviceId = settings.emailjs_service_id;
      const templateId = settings.emailjs_template_id;
      const publicKey = settings.emailjs_public_key;
      const adminEmail = settings.admin_email || 'admin@smartcafe.com';

      if (!serviceId || !templateId || !publicKey) {
        console.info('EmailJS integration is not configured in Admin Settings. Skipping notification email.');
        return;
      }

      // Build item list summary
      const itemsSummary = order.orderItems ? order.orderItems.map(item => 
        `x${item.quantity} ${item.menuItem?.name || 'Item'}`
      ).join(', ') : 'Cafe Order';

      const emailPayload = {
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
          order_id: order.id,
          table_number: order.tableNumber,
          total_price: `$${order.totalPrice.toFixed(2)}`,
          payment_method: order.paymentMethod,
          items_summary: itemsSummary,
          admin_email: adminEmail,
          created_at: new Date().toLocaleTimeString()
        }
      };

      const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload)
      });

      if (emailRes.ok) {
        console.log('>>> EmailJS alert successfully sent to Admin!');
      } else {
        const text = await emailRes.text();
        console.warn('>>> EmailJS alert failed to send:', text);
      }
    } catch (err) {
      console.warn('>>> EmailJS alert exception:', err);
    }
  };

  // 4. Handle Place Order
  const handlePlaceOrder = async () => {
    if (!tableNumber) {
      setTableModalOpen(true);
      return;
    }
    if (cartItems.length === 0) return;

    // If payment method is UPI, open the scanner modal instead of direct checkout
    if (paymentMethod === 'UPI' && !upiModalOpen) {
      setUpiModalOpen(true);
      return;
    }

    try {
      setIsPlacingOrder(true);
      
      const orderData = {
        tableNumber: tableNumber,
        paymentMethod: paymentMethod === 'UPI' 
          ? (skipUtr ? 'UPI (Verify Screen)' : `UPI (UTR: ${utrNumber})`) 
          : paymentMethod,
        items: cartItems.map(item => ({
          menuItemId: item.id,
          quantity: item.quantity
        }))
      };

      const result = await api.createOrder(orderData);
      setOrderConfirm(result);
      
      // Save order to localStorage for tab/session persistence
      saveOrderToHistory(result.id);
      
      // Async dispatch email notification has been disabled per client request
      // sendEmailJSAlert(result);

      clearCart();
      setIsCartOpen(false);
      setUpiModalOpen(false);
      setUtrNumber('');
      setSkipUtr(false);
    } catch (err) {
      alert('Failed to place order. Please try again.');
      console.error(err);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      await api.cancelOrder(orderId);
      alert('Order cancelled successfully.');
      setOrderConfirm(null);
      window.dispatchEvent(new Event('cafe_orders_updated'));
    } catch (err) {
      alert(err.message || 'Failed to cancel order.');
      console.error(err);
    }
  };

  const handleTableSubmit = (e) => {
    e.preventDefault();
    const num = parseInt(tempTableNum, 10);
    if (!isNaN(num) && num > 0) {
      setTableNumber(num);
      localStorage.setItem('tableNumber', num);
      setTableModalOpen(false);
      // update URL
      navigate(`?table=${num}`, { replace: true });
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Hero Banner Section */}
      <div className="relative h-[300px] md:h-[380px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/75 z-10" />
        <img 
          src="https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=1600&auto=format&fit=crop&q=80" 
          alt="The Hub Tropical Cafe Banner" 
          className="h-full w-full object-cover object-center scale-105 animate-pulse-slow"
        />
        <div className="absolute inset-0 flex flex-col justify-center items-center z-20 px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cafe-gold/20 border border-cafe-gold/30 mb-3 backdrop-blur-md">
            <Compass className="w-4 h-4 text-cafe-gold animate-spin-slow" />
            <span className="text-xs md:text-sm font-bold text-cafe-gold uppercase tracking-widest">
              {tableNumber ? `Table ${tableNumber} Active` : 'Scan Table QR'}
            </span>
          </div>
          <h1 className="font-serif text-3.5xl md:text-5.5xl lg:text-6xl text-white font-extrabold leading-tight mb-2 tracking-tight">
            The Hub <span className="text-cafe-gold italic">Tropical Cafe</span>
          </h1>
          <p className="text-gray-200 max-w-xl text-xs md:text-sm font-light uppercase tracking-wider">
            Anantapur's finest botanical dining escape. Fresh continental classics & signature cold infusions.
          </p>
        </div>
      </div>

      {/* Main Grid: Search and Categories */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between mb-8">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </span>
            <input
              type="text"
              placeholder="Search coffee, desserts, combos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-cafe-gold/20 bg-white dark:bg-cafe-charcoal/50 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cafe-gold focus:border-transparent transition shadow-sm"
            />
          </div>

          {/* Table ID Badge / Change Button */}
          <div className="flex items-center gap-3 bg-white dark:bg-cafe-chocolate/30 p-2.5 rounded-xl border border-cafe-gold/25 shadow-sm">
            <span className="text-sm font-medium text-cafe-darkgold dark:text-cafe-gold">
              {tableNumber ? `Table Number: ${tableNumber}` : 'No Table Selected'}
            </span>
            <button
              onClick={() => {
                setTempTableNum(tableNumber || '');
                setTableModalOpen(true);
              }}
              className="px-3 py-1 text-xs bg-cafe-gold text-cafe-chocolate rounded-lg font-medium hover:bg-cafe-darkgold hover:text-white transition"
            >
              Change
            </button>
          </div>
        </div>

        {/* Categories Tabs */}
        <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar mb-8 -mx-4 px-4 md:mx-0 md:px-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-full font-medium text-sm whitespace-nowrap transition-all duration-300 ${
                selectedCategory === cat
                  ? 'bg-cafe-wood text-white shadow-md shadow-cafe-wood/20 dark:bg-cafe-gold dark:text-cafe-chocolate'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-cafe-gold dark:bg-cafe-chocolate/20 dark:text-gray-300 dark:border-cafe-wood/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} className="h-96 bg-gray-200 dark:bg-cafe-chocolate/20 rounded-2xl" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 dark:text-gray-500 text-lg mb-2">No menu items match your selection.</p>
            <button 
              onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
              className="text-cafe-gold underline font-medium"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredItems.map((item) => (
              <div 
                key={item.id}
                className="group relative flex flex-col bg-white dark:bg-cafe-chocolate/10 rounded-2xl border border-cafe-gold/15 overflow-hidden shadow-sm hover:shadow-md hover:border-cafe-gold/30 transition-all duration-300"
              >
                {/* Image and Stock Overlay */}
                <div className="relative h-56 overflow-hidden bg-cafe-chocolate/5">
                  {!item.available && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center">
                      <span className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm uppercase tracking-wider shadow">
                        Out of Stock
                      </span>
                    </div>
                  )}
                  <img 
                    src={item.imageUrl || "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500"} 
                    alt={item.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-3 right-3 z-10 px-2.5 py-1 bg-black/75 backdrop-blur-md rounded-lg text-white flex items-center gap-1.5 border border-white/10 text-xs">
                    <Clock className="w-3.5 h-3.5 text-cafe-gold" />
                    <span>~{item.prepTimeMinutes} mins</span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-5 flex flex-col">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-serif text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-cafe-darkgold dark:group-hover:text-cafe-gold transition-colors">
                      {item.name}
                    </h3>
                    <span className="text-lg font-bold text-cafe-wood dark:text-cafe-gold whitespace-nowrap">
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-4 font-light">
                    {item.description}
                  </p>
                  
                  {/* Action Button */}
                  <div className="mt-auto">
                    {item.available ? (
                      <button
                        onClick={() => addToCart(item)}
                        className="w-full py-2.5 bg-cafe-wood text-white rounded-xl font-medium hover:bg-cafe-chocolate dark:bg-cafe-gold dark:text-cafe-chocolate dark:hover:bg-cafe-darkgold dark:hover:text-white flex items-center justify-center gap-2 transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add to Cart</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full py-2.5 bg-gray-200 dark:bg-cafe-chocolate/30 text-gray-400 dark:text-gray-600 rounded-xl font-medium cursor-not-allowed"
                      >
                        Unavailable
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Reviews Section (Option 3) */}
      {reviewsList.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-12 border-t border-cafe-gold/20 mt-8 mb-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 bg-cafe-gold/10 text-cafe-darkgold dark:text-cafe-gold px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>What Guests Say</span>
            </div>
            <h2 className="font-serif text-2xl md:text-3xl font-bold dark:text-white mb-2">Guest Review Highlights</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-light max-w-md mx-auto">
              Real reviews from actual customers who visited our botanical dining escape.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviewsList.map((rev) => (
              <div 
                key={rev.id} 
                className="bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/15 p-5 rounded-2xl shadow-sm flex flex-col justify-between"
              >
                <div>
                  {/* Rating Stars */}
                  <div className="flex gap-0.5 mb-3">
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

                  {/* Review Text */}
                  <p className="text-xs text-gray-600 dark:text-gray-300 font-light leading-relaxed italic mb-4">
                    "{rev.suggestions}"
                  </p>
                </div>

                {/* Review Author Name & Date */}
                <div className="border-t border-gray-100 dark:border-cafe-wood/20 pt-3 flex justify-between items-center text-[10px] text-gray-400">
                  <span className="font-semibold text-gray-800 dark:text-white">{rev.customerName}</span>
                  <span>{parseBackendDate(rev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cart Button Overlay */}
      {cartCount > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-6 z-40 bg-cafe-wood text-white dark:bg-cafe-gold dark:text-cafe-chocolate px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 hover:scale-105 transition duration-300"
        >
          <div className="relative">
            <ShoppingBag className="w-6 h-6" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {cartCount}
            </span>
          </div>
          <span className="font-bold">${cartTotal.toFixed(2)}</span>
        </button>
      )}

      {/* Cart Sidebar Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity" onClick={() => setIsCartOpen(false)} />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-md bg-white dark:bg-cafe-charcoal border-l border-cafe-gold/20 flex flex-col shadow-2xl">
              
              {/* Header */}
              <div className="px-5 py-6 border-b border-gray-100 dark:border-cafe-wood/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-cafe-wood dark:text-cafe-gold" />
                  <h2 className="font-serif text-xl font-bold dark:text-white">Your Cart</h2>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-cafe-chocolate/20 text-gray-400 dark:text-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {cartItems.length === 0 ? (
                  <div className="h-full flex flex-col justify-center items-center text-center">
                    <ShoppingBag className="w-16 h-16 text-gray-200 dark:text-cafe-wood/20 mb-3" />
                    <p className="text-gray-400 dark:text-gray-500">Your shopping cart is empty.</p>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4 p-3 bg-gray-50 dark:bg-cafe-chocolate/20 rounded-xl border border-gray-100 dark:border-cafe-wood/10">
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-medium text-sm text-gray-800 dark:text-white leading-tight">{item.name}</h4>
                          <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-cafe-darkgold dark:text-cafe-gold font-semibold mb-2">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 rounded bg-white border dark:bg-cafe-chocolate/40 dark:border-cafe-wood/35 text-gray-500 dark:text-gray-200"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-semibold dark:text-white w-6 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 rounded bg-white border dark:bg-cafe-chocolate/40 dark:border-cafe-wood/35 text-gray-500 dark:text-gray-200"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer Summary */}
              {cartItems.length > 0 && (
                <div className="p-5 border-t border-gray-100 dark:border-cafe-wood/20 bg-gray-50/50 dark:bg-cafe-chocolate/10 space-y-4">
                  <div className="space-y-1.5 text-sm font-light text-gray-500 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-normal text-gray-800 dark:text-white">${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxes & VAT (5%)</span>
                      <span className="font-normal text-gray-800 dark:text-white">${(cartTotal * 0.05).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Charge</span>
                      <span className="font-normal text-gray-800 dark:text-white">$1.00</span>
                    </div>
                    <hr className="my-2 border-gray-200 dark:border-cafe-wood/20" />
                    <div className="flex justify-between text-base font-bold text-gray-800 dark:text-white">
                      <span>Grand Total</span>
                      <span>${(cartTotal + (cartTotal * 0.05) + 1.00).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Payment Method</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'CASH_AT_COUNTER', label: 'Cash', icon: DollarSign },
                        { id: 'CARD', label: 'Card', icon: CreditCard },
                        { id: 'UPI', label: 'UPI/Scan', icon: Sparkles }
                      ].map(method => (
                        <button
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id)}
                          className={`flex flex-col items-center gap-1.5 py-2.5 rounded-lg border text-xs font-medium transition ${
                            paymentMethod === method.id
                              ? 'border-cafe-wood bg-cafe-wood/5 text-cafe-wood dark:border-cafe-gold dark:bg-cafe-gold/5 dark:text-cafe-gold'
                              : 'border-gray-200 dark:border-cafe-wood/30 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          <method.icon className="w-4 h-4" />
                          <span>{method.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handlePlaceOrder}
                    disabled={isPlacingOrder}
                    className="w-full py-4 bg-cafe-wood text-white dark:bg-cafe-gold dark:text-cafe-chocolate hover:bg-cafe-chocolate dark:hover:bg-cafe-darkgold dark:hover:text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-cafe-wood/10"
                  >
                    {isPlacingOrder ? (
                      <div className="w-5 h-5 border-2 border-white dark:border-cafe-chocolate border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Place Order</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table Identification Modal */}
      {tableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-cafe-charcoal rounded-2xl border border-cafe-gold/30 p-6 w-full max-w-sm shadow-2xl relative animate-scale-in">
            {tableNumber && (
              <button 
                onClick={() => setTableModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-cafe-gold/10 text-cafe-gold rounded-full flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold dark:text-white">Select Your Table</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-light mt-1">
                Enter your table number to associate your order correctly.
              </p>
            </div>
            <form onSubmit={handleTableSubmit} className="space-y-4">
              <div>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="Table Number (e.g. 5)"
                  value={tempTableNum}
                  onChange={(e) => setTempTableNum(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-cafe-gold/20 bg-white dark:bg-cafe-charcoal text-center text-lg font-bold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-cafe-gold"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-cafe-wood text-white dark:bg-cafe-gold dark:text-cafe-chocolate rounded-xl font-bold transition hover:bg-cafe-chocolate dark:hover:bg-cafe-darkgold dark:hover:text-white"
              >
                Confirm Table
              </button>
            </form>
          </div>
        </div>
      )}

      {/* UPI Payment Modal */}
      {upiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-cafe-charcoal rounded-2xl border border-cafe-gold/30 p-6 w-full max-w-sm text-center shadow-2xl relative animate-scale-in">
            <button 
              onClick={() => setUpiModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mb-4">
              <div className="w-10 h-10 bg-cafe-gold/10 text-cafe-gold rounded-full flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <h3 className="font-serif text-lg font-bold text-cafe-chocolate dark:text-white">Scan UPI QR to Pay</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-light mt-1">
                Scan the QR code using any UPI app (GPay, PhonePe, Paytm).
              </p>
            </div>

            {/* QR Code Container */}
            <div className="w-40 h-40 bg-white p-2 rounded-xl border border-gray-150 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                  `upi://pay?pa=${publicSettings?.upi_id || 'smartcafe@ybl'}&pn=SmartCafe&am=${(cartTotal + (cartTotal * 0.05) + 1.00).toFixed(2)}&cu=INR`
                )}`} 
                alt="UPI Payment QR" 
                className="w-full h-full object-contain"
              />
            </div>

            <div className="bg-gray-50 dark:bg-cafe-chocolate/10 border dark:border-cafe-wood/20 p-3 rounded-xl mb-4 text-left text-xs space-y-1.5 text-gray-500 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Amount to Pay</span>
                <span className="font-bold text-gray-800 dark:text-white">${(cartTotal + (cartTotal * 0.05) + 1.00).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>UPI ID</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-cafe-darkgold dark:text-cafe-gold select-all font-semibold">
                    {publicSettings?.upi_id || 'smartcafe@ybl'}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(publicSettings?.upi_id || 'smartcafe@ybl');
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-2 py-0.5 text-[10px] bg-cafe-gold/20 text-cafe-darkgold dark:text-cafe-gold border border-cafe-gold/30 rounded hover:bg-cafe-gold hover:text-cafe-chocolate transition font-bold"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* UTR Input Form */}
            <form onSubmit={(e) => { e.preventDefault(); handlePlaceOrder(); }} className="space-y-4">
              <div className="text-left space-y-2">
                <div className="flex justify-between items-center">
                  <label className={`text-[10px] font-semibold uppercase tracking-wider block ${skipUtr ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400'}`}>
                    12-Digit Transaction Reference (UTR)
                  </label>
                  {skipUtr && <span className="text-[10px] text-green-600 dark:text-green-400 font-bold">Counter Verification</span>}
                </div>
                <input
                  type="text"
                  pattern="\d{12}"
                  maxLength="12"
                  required={!skipUtr}
                  disabled={skipUtr}
                  placeholder={skipUtr ? "Not required - show screen to barista" : "Enter 12-digit UTR number"}
                  value={skipUtr ? "" : utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, ''))}
                  className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-cafe-charcoal text-center font-mono text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cafe-gold transition-all ${
                    skipUtr 
                      ? 'border-gray-200 dark:border-cafe-wood/25 opacity-40 bg-gray-50 cursor-not-allowed' 
                      : 'border-cafe-gold/25'
                  }`}
                />
                
                {/* Skip UTR Checkbox */}
                <label className="flex items-center gap-2 px-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={skipUtr}
                    onChange={(e) => {
                      setSkipUtr(e.target.checked);
                      if (e.target.checked) setUtrNumber('');
                    }}
                    className="w-4 h-4 rounded text-cafe-wood border-cafe-gold/25 focus:ring-cafe-gold focus:ring-2"
                  />
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 hover:text-cafe-wood dark:hover:text-cafe-gold">
                    I paid, skip entering UTR (Show payment screen at counter)
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isPlacingOrder}
                className="w-full py-3 bg-cafe-wood text-white dark:bg-cafe-gold dark:text-cafe-chocolate hover:bg-cafe-chocolate dark:hover:bg-cafe-darkgold dark:hover:text-white rounded-xl font-bold transition text-sm flex items-center justify-center gap-1.5 shadow-md"
              >
                {isPlacingOrder ? (
                  <div className="w-5 h-5 border-2 border-white dark:border-cafe-chocolate border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Verify & Submit Order</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Order Confirmation Modal Popup */}
      {orderConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-cafe-charcoal rounded-2xl border border-cafe-gold/30 p-6 w-full max-w-sm text-center shadow-2xl relative animate-scale-in">
            <button 
              onClick={() => setOrderConfirm(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              title="Close & Return to Menu"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-green-100 dark:bg-green-950/30 text-green-500 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200 dark:border-green-800/20">
              <Check className="w-8 h-8" />
            </div>
            
            <h3 className="font-serif text-xl font-bold dark:text-white mb-1">Order Received!</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-light mb-4">
              Order #{orderConfirm.id} • Table {orderConfirm.tableNumber}
            </p>
            
            <div className="bg-gray-50 dark:bg-cafe-chocolate/10 border dark:border-cafe-wood/20 p-4 rounded-xl mb-5 text-sm">
              <div className="flex justify-between mb-1.5 font-light text-gray-500 dark:text-gray-400">
                <span>Estimated Prep Time</span>
                <span className="font-medium text-cafe-darkgold dark:text-cafe-gold">~{orderConfirm.estimatedPrepTime} mins</span>
              </div>
              <div className="flex justify-between font-light text-gray-500 dark:text-gray-400">
                <span>Grand Total Paid</span>
                <span className="font-bold text-gray-800 dark:text-white">${orderConfirm.totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 mb-6 italic">
              A barista is preparing your order. You can play mind games or track your order progress.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => {
                  setOrderConfirm(null);
                  navigate('/games');
                }}
                className="py-3 border border-cafe-gold/30 text-cafe-wood dark:text-cafe-gold rounded-xl font-medium hover:bg-cafe-wood/5 transition text-sm"
              >
                Play Games
              </button>
              <button
                onClick={() => {
                  const id = orderConfirm.id;
                  setOrderConfirm(null);
                  navigate(`/track?orderId=${id}`);
                }}
                className="py-3 bg-cafe-wood text-white dark:bg-cafe-gold dark:text-cafe-chocolate hover:bg-cafe-chocolate dark:hover:bg-cafe-darkgold dark:hover:text-white rounded-xl font-bold transition text-sm flex items-center justify-center gap-1.5"
              >
                <span>Track Order</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={() => setOrderConfirm(null)}
                className="w-full py-2.5 bg-gray-50 border border-gray-200 dark:bg-cafe-charcoal/40 dark:border-cafe-wood/25 text-xs text-gray-700 dark:text-gray-200 hover:text-cafe-wood dark:hover:text-cafe-gold rounded-xl font-semibold transition"
              >
                Return to Menu / Order More
              </button>
              <button
                onClick={() => handleCancelOrder(orderConfirm.id)}
                className="w-full py-2 text-xs text-red-500 hover:text-red-700 font-bold transition hover:underline"
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
