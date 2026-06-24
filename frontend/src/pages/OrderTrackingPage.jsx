import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Clock, CheckCircle, Coffee, Sparkles, ChevronDown, 
  ChevronUp, ShieldCheck, HelpCircle, Gamepad2, ClipboardList, ArrowRight, Compass
} from 'lucide-react';
import { api } from '../services/api';
import { connectWebSocket, subscribeToOrder, disconnectWebSocket } from '../services/websocket';
import { parseBackendDate, formatLocalDateTime, getSavedOrderIds } from '../utils/dateUtils';
import { playCustomerStatusAlert, playPaymentReceivedSound } from '../utils/soundUtils';

export default function OrderTrackingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderIdParam = searchParams.get('orderId');

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  
  // Timer state for preparation countdown
  const [timeLeft, setTimeLeft] = useState(null);

  // References to handle timers
  const pollingRef = useRef(null);

  // History / List state (when orderIdParam is not provided)
  const [placedOrdersList, setPlacedOrdersList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // UPI configuration & verification state
  const [publicSettings, setPublicSettings] = useState(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const lastStatusRef = useRef(null);

  // Load public configurations on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await api.getPublicSettings();
        setPublicSettings(settings);
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    fetchSettings();
  }, []);

  // Status transition sound watcher
  useEffect(() => {
    if (!order) return;
    const currentStatus = order.status.toUpperCase();
    if (lastStatusRef.current && lastStatusRef.current !== currentStatus) {
      if (['PREPARING', 'READY', 'SERVED'].includes(currentStatus)) {
        playCustomerStatusAlert();
      }
    }
    lastStatusRef.current = currentStatus;
  }, [order]);

  const handleVerifyPayment = async () => {
    if (verifyingPayment) return;
    setVerifyingPayment(true);
    
    // Simulate verification check for 3 seconds
    setTimeout(async () => {
      try {
        const updated = await api.updateOrderPaymentStatus(order.id, 'COMPLETED');
        setOrder(updated);
        playPaymentReceivedSound();
        alert('UPI Payment Verified! Thank you. Your order is in preparation.');
        window.dispatchEvent(new Event('cafe_orders_updated'));
      } catch (err) {
        alert(err.message || 'Verification failed. Please try again.');
        console.error(err);
      } finally {
        setVerifyingPayment(false);
      }
    }, 3000);
  };

  // 1. Fetch Order Data initially & setup polling/WebSockets (Single tracking mode)
  useEffect(() => {
    if (!orderIdParam) {
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const data = await api.trackOrder(orderIdParam);
        setOrder(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Order not found or database is loading.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();

    // Setup WebSockets
    connectWebSocket(
      // On Connect Callback
      () => {
        setWsConnected(true);
        subscribeToOrder(orderIdParam, (updatedOrder) => {
          setOrder(updatedOrder);
        });
      },
      // On Error Callback
      () => {
        setWsConnected(false);
      }
    );

    // Fallback Polling every 8 seconds
    pollingRef.current = setInterval(() => {
      if (!wsConnected) {
        fetchOrder();
      }
    }, 8000);

    return () => {
      clearInterval(pollingRef.current);
      disconnectWebSocket();
    };
  }, [orderIdParam, wsConnected]);

  // 2. Estimate Prep Timer Countdown logic
  useEffect(() => {
    if (!order) return;
    
    // Calculate minutes left based on order creation time + prep time vs current time
    const calcTimeLeft = () => {
      const createdAt = parseBackendDate(order.createdAt || order.updatedAt);
      const prepTimeMs = order.estimatedPrepTime * 60 * 1000;
      const targetTime = createdAt.getTime() + prepTimeMs;
      const diff = targetTime - Date.now();

      if (diff <= 0 || order.status === 'READY' || order.status === 'SERVED') {
        setTimeLeft(0);
      } else {
        setTimeLeft(Math.ceil(diff / 60 / 1000));
      }
    };

    calcTimeLeft();
    const timer = setInterval(calcTimeLeft, 30000); // update every 30 seconds

    return () => clearInterval(timer);
  }, [order]);

  // 3. Fetch all orders from history (List mode)
  useEffect(() => {
    if (orderIdParam) return;

    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const storedIds = getSavedOrderIds();
        if (storedIds.length === 0) {
          setPlacedOrdersList([]);
          setLoadingHistory(false);
          return;
        }

        const fetchPromises = storedIds.map(async (id) => {
          try {
            return await api.trackOrder(id);
          } catch (err) {
            console.error(`Error loading order ${id}:`, err);
            return null;
          }
        });

        const results = await Promise.all(fetchPromises);
        const validOrders = results.filter(o => o !== null);
        
        // Sort newest first
        validOrders.sort((a, b) => parseBackendDate(b.createdAt) - parseBackendDate(a.createdAt));
        setPlacedOrdersList(validOrders);
      } catch (err) {
        console.error('Error fetching order history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [orderIdParam]);

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      const updated = await api.cancelOrder(order.id);
      setOrder(updated);
      alert('Order cancelled successfully.');
      window.dispatchEvent(new Event('cafe_orders_updated'));
    } catch (err) {
      alert(err.message || 'Failed to cancel order.');
      console.error(err);
    }
  };

  const handleCancelHistoryOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      const updated = await api.cancelOrder(orderId);
      setPlacedOrdersList(prev => prev.map(o => o.id === orderId ? updated : o));
      alert('Order cancelled successfully.');
      window.dispatchEvent(new Event('cafe_orders_updated'));
    } catch (err) {
      alert(err.message || 'Failed to cancel order.');
      console.error(err);
    }
  };

  // Render Order History Dashboard if no specific order is being tracked
  if (!orderIdParam) {
    if (loadingHistory) {
      return (
        <div className="flex flex-col justify-center items-center min-h-[70vh] px-4">
          <div className="w-12 h-12 border-4 border-cafe-gold border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500 dark:text-gray-400 animate-pulse font-light">Loading your orders history...</p>
        </div>
      );
    }

    const activeOrders = placedOrdersList.filter(o => ['RECEIVED', 'PREPARING', 'READY'].includes(o.status.toUpperCase()));
    const pastOrders = placedOrdersList.filter(o => ['SERVED', 'CANCELLED'].includes(o.status.toUpperCase()));

    return (
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-cafe-gold/10 text-cafe-darkgold dark:text-cafe-gold rounded-2xl flex items-center justify-center mx-auto mb-3 border border-cafe-gold/20 animate-scale-in">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-3xl font-bold dark:text-white mb-1.5">My Orders Center</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-light">
            Track preparations and view past dining logs.
          </p>
        </div>

        {placedOrdersList.length === 0 ? (
          <div className="bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/20 rounded-2xl p-8 text-center shadow-xs">
            <div className="w-16 h-16 bg-cafe-gold/10 text-cafe-gold rounded-full flex items-center justify-center mx-auto mb-4">
              <Compass className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-xl font-bold dark:text-white mb-2">No Orders Found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-light mb-6">
              You haven't placed any orders yet. Visit our menu to select your favorite treats.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-cafe-wood text-white dark:bg-cafe-gold dark:text-cafe-chocolate hover:bg-cafe-chocolate dark:hover:bg-cafe-darkgold dark:hover:text-white rounded-xl font-bold transition"
            >
              Explore Menu
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. Active Preparations */}
            {activeOrders.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-cafe-darkgold dark:text-cafe-gold uppercase tracking-widest flex items-center gap-1.5 pl-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                  <span>Active Preparations ({activeOrders.length})</span>
                </h3>
                
                <div className="space-y-4">
                  {activeOrders.map((ord) => {
                    const created = parseBackendDate(ord.createdAt || ord.updatedAt);
                    const prepTimeMs = ord.estimatedPrepTime * 60 * 1000;
                    const target = created.getTime() + prepTimeMs;
                    const diffTime = target - Date.now();
                    const activeTimeLeft = diffTime <= 0 || ord.status === 'READY' ? 0 : Math.ceil(diffTime / 60 / 1000);

                    return (
                      <div 
                        key={ord.id}
                        className="bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/30 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between gap-4"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-bold text-cafe-wood dark:text-cafe-gold">Order #{ord.id}</span>
                            <span className="text-gray-400 text-xs font-light block mt-0.5">Table {ord.tableNumber} • {formatLocalDateTime(ord.createdAt)}</span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            ord.status === 'READY' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' 
                              : ord.status === 'PREPARING'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400'
                          }`}>
                            {ord.status}
                          </span>
                        </div>

                        <div className="text-xs text-gray-600 dark:text-gray-300 font-light border-y border-dashed border-gray-100 dark:border-cafe-wood/20 py-2.5">
                          {ord.orderItems && ord.orderItems.map((item, idx) => (
                            <span key={item.id}>
                              {idx > 0 && ", "}
                              {item.quantity}x {item.menuItem?.name}
                            </span>
                          ))}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="w-3.5 h-3.5 text-cafe-gold" />
                            {ord.status === 'READY' ? (
                              <span className="font-semibold text-green-600 dark:text-green-400">Ready at counter!</span>
                            ) : (
                              <span>Estimated: <strong className="font-semibold text-cafe-darkgold dark:text-cafe-gold">~{activeTimeLeft > 0 ? activeTimeLeft : '< 1'} mins</strong> left</span>
                            )}
                          </div>
                          
                          <div className="flex gap-2 w-full sm:w-auto">
                            {ord.status === 'RECEIVED' && (
                              <button
                                onClick={() => handleCancelHistoryOrder(ord.id)}
                                className="px-3.5 py-2 border border-red-200 dark:border-red-950/20 text-red-500 hover:text-red-700 rounded-xl text-xs font-semibold transition"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              onClick={() => navigate(`/track?orderId=${ord.id}`)}
                              className="flex-1 sm:flex-initial px-4 py-2 bg-cafe-wood text-white dark:bg-cafe-gold dark:text-cafe-chocolate hover:bg-cafe-chocolate dark:hover:bg-cafe-darkgold dark:hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                            >
                              <span>Track Live</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Past Treats */}
            {pastOrders.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">
                  Past Treats ({pastOrders.length})
                </h3>
                
                <div className="space-y-3">
                  {pastOrders.map((ord) => (
                    <div 
                      key={ord.id}
                      className="bg-white dark:bg-cafe-chocolate/5 border border-cafe-gold/15 rounded-xl p-4 shadow-xs flex items-center justify-between gap-4 opacity-80 hover:opacity-100 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Order #{ord.id}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ord.status === 'SERVED' 
                              ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' 
                              : 'bg-red-50 text-red-500 dark:bg-red-950/20 dark:text-red-400'
                          }`}>
                            {ord.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-light">
                          {formatLocalDateTime(ord.createdAt)} • Table {ord.tableNumber}
                        </p>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-light truncate max-w-[280px] sm:max-w-md">
                          {ord.orderItems && ord.orderItems.map((item, idx) => (
                            <span key={item.id}>
                              {idx > 0 && ", "}
                              {item.quantity}x {item.menuItem?.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="text-right flex flex-col items-end gap-1.5">
                        <span className="text-xs font-bold text-gray-800 dark:text-white">₹{ord.totalPrice.toFixed(2)}</span>
                        <button
                          onClick={() => navigate(`/track?orderId=${ord.id}`)}
                          className="px-2.5 py-1 border border-cafe-gold/25 text-cafe-darkgold dark:text-cafe-gold hover:bg-cafe-gold/10 rounded-lg text-[10px] font-bold transition"
                        >
                          View Receipt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8">
          <button
            onClick={() => navigate('/')}
            className="w-full py-3.5 bg-cafe-wood text-white dark:bg-cafe-gold dark:text-cafe-chocolate hover:bg-cafe-chocolate dark:hover:bg-cafe-darkgold dark:hover:text-white rounded-xl font-bold transition text-sm flex items-center justify-center gap-1.5 shadow-md"
          >
            <span>Back to Menu / Order More</span>
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[70vh] px-4">
        <div className="w-12 h-12 border-4 border-cafe-gold border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500 dark:text-gray-400 animate-pulse font-light">Connecting to live tracking channels...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center px-4 py-16">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h3 className="font-serif text-xl font-bold dark:text-white mb-2">Tracking Failed</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-light mb-6">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-cafe-wood text-white dark:bg-cafe-gold dark:text-cafe-chocolate rounded-xl font-bold transition hover:bg-cafe-chocolate dark:hover:bg-cafe-darkgold dark:hover:text-white"
        >
          Go to Menu
        </button>
      </div>
    );
  }

  const steps = [
    { id: 'RECEIVED', label: 'Order Received', desc: 'Sent to barista' },
    { id: 'PREPARING', label: 'Preparing', desc: 'Brewing/Cooking' },
    { id: 'READY', label: 'Ready', desc: 'Pick up at counter' },
    { id: 'SERVED', label: 'Served', desc: 'Enjoy your meal!' }
  ];

  const getStepIndex = (status) => {
    return steps.findIndex(s => s.id === status.toUpperCase());
  };

  const currentStepIdx = getStepIndex(order.status);

  // Descriptive text depending on order state
  const getStatusNarration = (status) => {
    switch (status.toUpperCase()) {
      case 'RECEIVED':
        return "We've got your order! A barista is reviewing it and checking stock availability.";
      case 'PREPARING':
        return "Your coffee is grinding and desserts are being plated. Sensory magic is happening!";
      case 'READY':
        return "Freshly prepped! Please show this screen at the pickup counter to collect your tray.";
      case 'SERVED':
        return "Served and completed. We hope you love it! Please leave us your feedback.";
      case 'CANCELLED':
        return "This order has been cancelled.";
      default:
        return "Processing your coffee order...";
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
      {/* Live tracking banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800/10 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
          <span>{wsConnected ? 'Live Connection' : 'Polling Updates'}</span>
        </div>
        <h2 className="font-serif text-3xl font-bold dark:text-white mb-1.5">Live Order Tracker</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-light">
          Order #{order.id} • Table {order.tableNumber}
        </p>
      </div>

      {/* Progress Cards / Status Circle */}
      <div className="bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/20 rounded-2xl p-6 shadow-sm mb-6 text-center">
        {order.status !== 'SERVED' && order.status !== 'READY' && order.status !== 'CANCELLED' && timeLeft !== null && (
          <div className="mb-6">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Estimated Wait</p>
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-7 h-7 text-cafe-gold animate-bounce-subtle" />
              <span className="text-4xl font-extrabold text-cafe-wood dark:text-cafe-gold font-serif">
                {timeLeft > 0 ? `~${timeLeft}` : '< 1'}
              </span>
              <span className="text-lg font-medium text-gray-500 dark:text-gray-400 self-end mb-1">mins</span>
            </div>
          </div>
        )}

        {/* UPI Payment Card */}
        {order.paymentMethod.startsWith('UPI') && order.paymentStatus === 'PENDING' && order.status !== 'CANCELLED' && (
          <div className="my-6 p-5 bg-cafe-gold/5 border border-cafe-gold/25 rounded-2xl space-y-4 max-w-sm mx-auto shadow-inner animate-scale-in">
            <div className="text-center">
              <Sparkles className="w-6 h-6 text-cafe-gold mx-auto mb-1 animate-pulse" />
              <h4 className="font-serif text-sm font-bold dark:text-white">Complete Your UPI Payment</h4>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-light leading-normal">
                Scan the QR code below to pay directly to the café.
              </p>
            </div>

            <div className="w-36 h-36 bg-white p-2 rounded-xl border border-gray-150 flex items-center justify-center mx-auto shadow-sm">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                  `upi://pay?pa=${publicSettings?.upi_id || 'smartcafe@ybl'}&pn=SmartCafe&am=${(order.totalPrice).toFixed(2)}&cu=INR`
                )}`} 
                alt="UPI Payment QR" 
                className="w-full h-full object-contain"
              />
            </div>

            <div className="text-[10px] text-gray-500 dark:text-gray-400 flex flex-col items-center gap-1">
              <span>UPI ID: <strong className="font-semibold select-all font-mono text-cafe-darkgold dark:text-cafe-gold">{publicSettings?.upi_id || 'smartcafe@ybl'}</strong></span>
              <span>Amount: <strong className="font-semibold text-gray-800 dark:text-white">₹{order.totalPrice.toFixed(2)}</strong></span>
            </div>

            <button
              onClick={handleVerifyPayment}
              disabled={verifyingPayment}
              className="w-full py-2.5 bg-cafe-wood hover:bg-cafe-chocolate dark:bg-cafe-gold dark:text-cafe-chocolate dark:hover:bg-cafe-darkgold dark:hover:text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              {verifyingPayment ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white dark:border-cafe-chocolate border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Transaction...</span>
                </>
              ) : (
                <span>Verify Payment</span>
              )}
            </button>
          </div>
        )}

        {order.status === 'READY' && (
          <div className="mb-6 p-4 bg-cafe-gold/10 border border-cafe-gold/30 rounded-xl animate-pulse">
            <Coffee className="w-10 h-10 text-cafe-gold mx-auto mb-2" />
            <h4 className="font-serif text-lg font-bold text-cafe-darkgold dark:text-cafe-gold">Order is Ready for Pickup!</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Please head to the counter and show receipt #{order.id}.</p>
          </div>
        )}

        {order.status === 'SERVED' && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/15 border border-green-200 dark:border-green-800/10 rounded-xl">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <h4 className="font-serif text-lg font-bold text-green-600 dark:text-green-400">Order Successfully Served</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Thank you for dining with us! We hope to see you again.</p>
          </div>
        )}

        {order.status === 'CANCELLED' && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/15 border border-red-200 dark:border-red-800/10 rounded-xl">
            <HelpCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
            <h4 className="font-serif text-lg font-bold text-red-600 dark:text-red-400">Order Cancelled</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This order has been cancelled. If paid, please speak with the barista at the counter for a refund.</p>
          </div>
        )}

        <p className="text-sm text-gray-600 dark:text-gray-300 font-light leading-relaxed px-2">
          {getStatusNarration(order.status)}
        </p>
      </div>

      {/* Waiting Room Call to Action */}
      {(order.status === 'RECEIVED' || order.status === 'PREPARING') && (
        <div className="bg-gradient-to-r from-cafe-wood to-cafe-chocolate dark:from-cafe-chocolate/50 dark:to-cafe-charcoal border border-cafe-gold/25 rounded-2xl p-5 shadow-md mb-8 text-white flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h4 className="font-serif text-lg font-bold text-cafe-gold flex items-center justify-center md:justify-start gap-1.5 mb-1">
              <Gamepad2 className="w-5 h-5 text-cafe-gold animate-bounce-subtle" />
              <span>Wait is boring?</span>
            </h4>
            <p className="text-xs text-gray-300 font-light">Play interactive mind-refreshing games while baristas brew your cup!</p>
          </div>
          <button
            onClick={() => navigate('/games')}
            className="w-full md:w-auto px-5 py-2.5 bg-cafe-gold hover:bg-cafe-darkgold text-cafe-chocolate hover:text-white rounded-xl text-sm font-bold transition whitespace-nowrap"
          >
            Play Waiting Games
          </button>
        </div>
      )}

      {/* Visual Live Tracker (Vertical Steps) */}
      {order.status !== 'CANCELLED' && (
        <div className="bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/15 rounded-2xl p-6 shadow-sm mb-6">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">Step Tracker</h4>
          <div className="relative pl-8 space-y-8">
            {/* Vertical Connecting Line */}
            <div className="absolute top-3 bottom-3 left-3.5 w-0.5 bg-gray-200 dark:bg-cafe-wood/25" />
            <div 
              className="absolute top-3 left-3.5 w-0.5 bg-cafe-gold transition-all duration-1000" 
              style={{ height: `${(currentStepIdx / (steps.length - 1)) * 90}%` }}
            />

            {steps.map((step, idx) => {
              const isCompleted = idx < currentStepIdx;
              const isActive = idx === currentStepIdx;
              const isPending = idx > currentStepIdx;

              return (
                <div key={step.id} className="relative flex gap-4">
                  {/* Node Circle */}
                  <div className={`absolute -left-8 w-7.5 h-7.5 rounded-full flex items-center justify-center border z-10 transition ${
                    isCompleted 
                      ? 'bg-cafe-gold border-cafe-gold text-cafe-chocolate' 
                      : isActive 
                      ? 'bg-cafe-wood border-cafe-gold text-cafe-gold scale-110 shadow-md shadow-cafe-gold/20' 
                      : 'bg-white border-gray-200 dark:bg-cafe-charcoal dark:border-cafe-wood/30 text-gray-300'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : isActive ? (
                      <Coffee className="w-3.5 h-3.5 animate-pulse" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-cafe-wood/40" />
                    )}
                  </div>

                  <div className="flex-1">
                    <h5 className={`text-sm font-bold transition-colors ${
                      isActive 
                        ? 'text-cafe-darkgold dark:text-cafe-gold' 
                        : isCompleted 
                        ? 'text-gray-700 dark:text-gray-200' 
                        : 'text-gray-400 dark:text-gray-600'
                    }`}>
                      {step.label}
                    </h5>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-light mt-0.5">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expandable Order Receipt */}
      <div className="bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/15 rounded-2xl overflow-hidden shadow-sm">
        <button
          onClick={() => setShowReceipt(!showReceipt)}
          className="w-full px-6 py-4 flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-cafe-chocolate/20 transition"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cafe-gold" />
            <span>Order Summary Receipt</span>
          </div>
          {showReceipt ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showReceipt && (
          <div className="px-6 pb-5 pt-2 border-t border-gray-100 dark:border-cafe-wood/20 space-y-4">
            {/* Items list */}
            <div className="space-y-3.5">
              {order.orderItems && order.orderItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm font-light">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-cafe-chocolate/30 rounded text-cafe-darkgold dark:text-cafe-gold font-bold">
                      x{item.quantity}
                    </span>
                    <span className="text-gray-800 dark:text-gray-200">{item.menuItem?.name}</span>
                  </div>
                  <span className="font-normal text-gray-800 dark:text-white">₹{(item.priceAtOrder * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Calculations breakdown */}
            <div className="border-t border-dashed border-gray-200 dark:border-cafe-wood/20 pt-4 space-y-1.5 text-xs font-light text-gray-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-gray-800 dark:text-gray-200">
                  ₹{(order.totalPrice - (order.totalPrice * 0.05) - 10.00 > 0 
                     ? (order.totalPrice - 10.00) / 1.05 
                     : order.totalPrice).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>VAT & Taxes (5%)</span>
                <span className="text-gray-800 dark:text-gray-200">
                  ₹{(order.totalPrice - (order.totalPrice * 0.05) - 10.00 > 0 
                     ? ((order.totalPrice - 10.00) / 1.05) * 0.05 
                     : 0.0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Service Fee</span>
                <span className="text-gray-800 dark:text-gray-200">₹10.00</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-gray-800 dark:text-white pt-2">
                <span>Grand Total</span>
                <span>₹{order.totalPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Meta */}
            <div className="flex justify-between items-center bg-gray-50 dark:bg-cafe-chocolate/20 p-2.5 rounded-lg text-xs text-gray-400">
              <span>Payment Type: <strong className="text-gray-800 dark:text-gray-200">{order.paymentMethod}</strong></span>
              <span className={`px-2 py-0.5 rounded font-bold ${
                order.paymentStatus === 'COMPLETED' 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-yellow-100 text-yellow-600'
              }`}>
                {order.paymentStatus}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Return to Storefront & Cancel CTAs */}
      <div className="mt-8 space-y-3">
        <button
          onClick={() => navigate('/track')}
          className="w-full py-3.5 border border-cafe-gold/30 text-cafe-wood dark:text-cafe-gold hover:bg-cafe-wood/5 rounded-xl font-bold transition text-sm flex items-center justify-center gap-1.5 shadow-xs"
        >
          <ClipboardList className="w-4 h-4" />
          <span>View All My Orders</span>
        </button>

        <button
          onClick={() => navigate(order ? `/?table=${order.tableNumber}` : '/')}
          className="w-full py-3.5 bg-cafe-wood text-white dark:bg-cafe-gold dark:text-cafe-chocolate hover:bg-cafe-chocolate dark:hover:bg-cafe-darkgold dark:hover:text-white rounded-xl font-bold transition text-sm flex items-center justify-center gap-1.5 shadow-md"
        >
          <span>Return to Menu / Order More</span>
        </button>

        {order && order.status === 'RECEIVED' && (
          <button
            onClick={handleCancelOrder}
            className="w-full py-3 border border-red-200 dark:border-red-950/20 text-red-500 hover:text-red-700 font-bold rounded-xl transition text-sm flex items-center justify-center"
          >
            Cancel Order
          </button>
        )}
      </div>
    </div>
  );
}
