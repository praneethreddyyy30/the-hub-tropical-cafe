import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

let stompClient = null;

const getWsUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace('/api', '/ws');
  }
  const origin = window.location.origin;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return 'http://localhost:8080/ws';
  }
  return `${origin}/ws`;
};

export const connectWebSocket = (onConnectCallback, onErrorCallback) => {
  try {
    const socket = new SockJS(getWsUrl());
    stompClient = Stomp.over(socket);
    // Disable verbose debugging to keep user's console clean
    stompClient.debug = null;
    
    stompClient.connect({}, () => {
      if (onConnectCallback) onConnectCallback();
    }, (error) => {
      console.warn("STOMP connection failed, using fallback polling.", error);
      if (onErrorCallback) onErrorCallback(error);
    });
  } catch (err) {
    console.warn("WebSocket initialization failed, using fallback polling.", err);
    if (onErrorCallback) onErrorCallback(err);
  }
};

export const subscribeToOrders = (onOrderUpdate) => {
  if (!stompClient || !stompClient.connected) return null;
  try {
    return stompClient.subscribe('/topic/orders', (message) => {
      onOrderUpdate(JSON.parse(message.body));
    });
  } catch (e) {
    console.error("Failed to subscribe to /topic/orders", e);
    return null;
  }
};

export const subscribeToOrder = (orderId, onOrderUpdate) => {
  if (!stompClient || !stompClient.connected) return null;
  try {
    return stompClient.subscribe(`/topic/order/${orderId}`, (message) => {
      onOrderUpdate(JSON.parse(message.body));
    });
  } catch (e) {
    console.error(`Failed to subscribe to /topic/order/${orderId}`, e);
    return null;
  }
};

export const disconnectWebSocket = () => {
  if (stompClient) {
    try {
      stompClient.disconnect();
    } catch (e) {
      // already disconnected
    }
  }
};
