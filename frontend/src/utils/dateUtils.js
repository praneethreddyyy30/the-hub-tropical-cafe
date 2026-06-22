/**
 * Safely parses an ISO-8601 date-time string sent by the backend.
 * Since the backend JVM is set to UTC, dates are stored and returned in UTC.
 * If the string lacks a timezone offset, we append 'Z' to force the browser 
 * to parse it in UTC instead of the browser's local timezone.
 */
export function parseBackendDate(dateString) {
  if (!dateString) return null;
  let formatted = dateString;
  if (
    typeof dateString === 'string' && 
    dateString.includes('T') && 
    !dateString.endsWith('Z') && 
    !dateString.match(/[+-]\d{2}:\d{2}$/)
  ) {
    formatted = dateString + 'Z';
  }
  return new Date(formatted);
}

/**
 * Parses and formats an ISO-8601 date string to a user-friendly local format.
 */
export function formatLocalDateTime(dateString) {
  const date = parseBackendDate(dateString);
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Retrieves the list of valid, unexpired placed order IDs from localStorage.
 * Automatically deletes any orders placed more than 2 hours ago.
 */
export function getSavedOrderIds() {
  try {
    const raw = localStorage.getItem('cafe_placed_orders') || '[]';
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const twoHours = 2 * 60 * 60 * 1000;
    
    // Normalize old format (raw numbers) to new format (objects with timestamps)
    const normalized = parsed.map(item => {
      if (typeof item === 'object' && item !== null && item.id) {
        return item;
      }
      return { id: Number(item), timestamp: now };
    });

    // Filter to retain only orders placed within the last 2 hours
    const valid = normalized.filter(item => now - item.timestamp < twoHours);

    // Save changes back to localStorage if clean-up occurred
    if (valid.length !== parsed.length) {
      localStorage.setItem('cafe_placed_orders', JSON.stringify(valid));
      window.dispatchEvent(new Event('cafe_orders_updated'));
    }

    return valid.map(item => item.id);
  } catch (err) {
    console.error('Error reading order history:', err);
    return [];
  }
}

/**
 * Saves a newly placed order ID to localStorage along with a current timestamp.
 * Retains only the last 20 orders placed.
 */
export function saveOrderToHistory(orderId) {
  try {
    const raw = localStorage.getItem('cafe_placed_orders') || '[]';
    const parsed = JSON.parse(raw);
    const now = Date.now();
    
    // Normalize existing items
    const normalized = parsed.map(item => {
      if (typeof item === 'object' && item !== null && item.id) {
        return item;
      }
      return { id: Number(item), timestamp: now };
    });

    // Remove any existing entries for the same orderId to avoid duplicates
    const filtered = normalized.filter(item => item.id !== Number(orderId));
    
    // Append the new order
    filtered.push({ id: Number(orderId), timestamp: now });

    // Limit retention count to 20
    if (filtered.length > 20) {
      filtered.shift();
    }

    localStorage.setItem('cafe_placed_orders', JSON.stringify(filtered));
    window.dispatchEvent(new Event('cafe_orders_updated'));
  } catch (err) {
    console.error('Error writing order to history:', err);
  }
}
