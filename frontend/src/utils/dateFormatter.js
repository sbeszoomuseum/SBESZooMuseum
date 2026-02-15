/**
 * Date formatting utilities with IST (Indian Standard Time) timezone support
 */

/**
 * Get current date and time in IST
 * @returns {Date} Current date/time in IST
 */
export function getCurrentDateIST() {
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return istTime;
}

/**
 * Format date to IST locale string
 * @param {Date|string} date - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string in IST
 */
export function formatDateIST(date, options = {}) {
  const defaultOptions = { timeZone: 'Asia/Kolkata', ...options };
  return new Date(date).toLocaleDateString('en-IN', defaultOptions);
}

/**
 * Format time to IST locale string
 * @param {Date|string} date - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted time string in IST
 */
export function formatTimeIST(date, options = {}) {
  const defaultOptions = { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', ...options };
  return new Date(date).toLocaleTimeString('en-IN', defaultOptions);
}

/**
 * Format date and time together in IST
 * @param {Date|string} date - Date to format
 * @param {object} dateOptions - Intl.DateTimeFormat options for date
 * @param {object} timeOptions - Intl.DateTimeFormat options for time
 * @returns {string} Formatted date and time string in IST
 */
export function formatDateTimeIST(date, dateOptions = {}, timeOptions = {}) {
  const formattedDate = formatDateIST(date, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    ...dateOptions 
  });
  const formattedTime = formatTimeIST(date, { 
    hour: '2-digit', 
    minute: '2-digit',
    ...timeOptions 
  });
  return `${formattedDate} ${formattedTime}`;
}

/**
 * Get timestamp for storing in database (IST-aware)
 * @returns {number} Milliseconds since epoch
 */
export function getTimestampIST() {
  return getCurrentDateIST().getTime();
}
