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
