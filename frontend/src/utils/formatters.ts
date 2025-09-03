/**
 * Utility functions for formatting trading data
 */

/**
 * Format price with currency symbol
 */
export const formatPrice = (price: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)
}

/**
 * Format timestamp for display (UTC)
 */
export const formatTimestamp = (timestamp: string): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',  // Force UTC display
  }).format(new Date(timestamp))
}

/**
 * Format time only (UTC)
 */
export const formatTime = (timestamp: string): string => {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',  // Force UTC display
  }).format(new Date(timestamp))
}