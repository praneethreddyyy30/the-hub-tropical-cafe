const getBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  const origin = window.location.origin;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return 'http://localhost:8080/api';
  }
  return 'https://the-hub-tropical-cafe.onrender.com/api';
};

const BASE_URL = getBaseUrl();

const getHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('adminToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // Public Menu APIs
  getMenu: async () => {
    const res = await fetch(`${BASE_URL}/menu`);
    return res.json();
  },
  
  getMenuByCategory: async (category) => {
    const res = await fetch(`${BASE_URL}/menu/category/${category}`);
    return res.json();
  },

  // Public Ordering APIs
  createOrder: async (orderData) => {
    const res = await fetch(`${BASE_URL}/orders/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    if (!res.ok) throw new Error('Failed to place order');
    return res.json();
  },

  trackOrder: async (orderId) => {
    const res = await fetch(`${BASE_URL}/orders/track/${orderId}`);
    if (!res.ok) throw new Error('Order not found');
    return res.json();
  },

  cancelOrder: async (orderId) => {
    const res = await fetch(`${BASE_URL}/orders/${orderId}/cancel`, {
      method: 'POST'
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || 'Failed to cancel order');
    }
    return res.json();
  },

  updateOrderPaymentStatus: async (orderId, status) => {
    const res = await fetch(`${BASE_URL}/orders/${orderId}/payment-status?status=${status}`, {
      method: 'PUT'
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || 'Failed to update payment status');
    }
    return res.json();
  },

  // Public Feedback APIs
  submitFeedback: async (feedbackData) => {
    const res = await fetch(`${BASE_URL}/feedback/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackData)
    });
    if (!res.ok) throw new Error('Failed to submit feedback');
    return res.json();
  },

  getFeedbackList: async () => {
    const res = await fetch(`${BASE_URL}/feedback`);
    return res.json();
  },

  // Admin Menu Management APIs
  adminCreateMenuItem: async (itemData) => {
    const res = await fetch(`${BASE_URL}/admin/menu`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(itemData)
    });
    if (!res.ok) throw new Error('Failed to create menu item');
    return res.json();
  },

  adminUpdateMenuItem: async (id, itemData) => {
    const res = await fetch(`${BASE_URL}/admin/menu/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(itemData)
    });
    if (!res.ok) throw new Error('Failed to update menu item');
    return res.json();
  },

  adminDeleteMenuItem: async (id) => {
    const res = await fetch(`${BASE_URL}/admin/menu/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete menu item');
    return res;
  },

  adminToggleAvailability: async (id) => {
    const res = await fetch(`${BASE_URL}/admin/menu/${id}/toggle-availability`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to toggle availability');
    return res.json();
  },

  // Admin Order Management APIs
  adminGetOrders: async () => {
    const res = await fetch(`${BASE_URL}/admin/orders`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
  },

  adminUpdateOrderStatus: async (id, status) => {
    const res = await fetch(`${BASE_URL}/admin/orders/${id}/status?status=${status}`, {
      method: 'PUT',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to update order status');
    return res.json();
  },

  adminUpdateOrderPrepTime: async (id, minutes) => {
    const res = await fetch(`${BASE_URL}/admin/orders/${id}/prep-time?minutes=${minutes}`, {
      method: 'PUT',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to update preparation time');
    return res.json();
  },

  // Admin Dashboard & Analytics APIs
  adminGetDashboardOverview: async () => {
    const res = await fetch(`${BASE_URL}/admin/dashboard/overview`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch dashboard overview');
    return res.json();
  },

  adminGetSalesAnalytics: async () => {
    const res = await fetch(`${BASE_URL}/admin/dashboard/analytics/sales`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch sales analytics');
    return res.json();
  },

  adminGetFeedbackSummary: async () => {
    const res = await fetch(`${BASE_URL}/admin/feedback/summary`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch feedback summary');
    return res.json();
  },

  // Settings APIs
  getPublicSettings: async () => {
    const res = await fetch(`${BASE_URL}/settings/public`);
    if (!res.ok) throw new Error('Failed to fetch public settings');
    return res.json();
  },

  getAdminSettings: async () => {
    const res = await fetch(`${BASE_URL}/admin/settings`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch admin settings');
    return res.json();
  },

  updateAdminSettings: async (settings) => {
    const res = await fetch(`${BASE_URL}/admin/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  adminChangePassword: async (newPassword) => {
    const res = await fetch(`${BASE_URL}/admin/dashboard/change-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ newPassword })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || 'Failed to change password');
    }
    return res.json();
  },

  adminDeleteFeedback: async (id) => {
    const res = await fetch(`${BASE_URL}/admin/feedback/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete feedback');
    return res.json();
  }
};
