/**
 * Currency utilities for displaying Naira amounts
 */

export const CURRENCY_SYMBOL = '₦';
export const CURRENCY_CODE = 'NGN';

/**
 * Format a number as Nigerian Naira currency
 * @param amount The amount to format
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted string like "₦1,234.50"
 */
export function formatNaira(amount: number, decimals = 2): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-NG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Format a number as Naira without currency symbol
 * @param amount The amount to format
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted string like "1,234.50"
 */
export function formatNairaAmount(amount: number, decimals = 2): string {
  return amount.toLocaleString('en-NG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Convert USD amount to Naira (for legacy data conversion)
 * Note: This is a placeholder - adjust the exchange rate as needed
 * @param usdAmount The USD amount to convert
 * @param exchangeRate The USD to NGN exchange rate (default: 1500)
 * @returns The converted amount in Naira
 */
export function convertUsdToNaira(usdAmount: number, exchangeRate = 1500): number {
  return usdAmount * exchangeRate;
}

/**
 * Strip currency symbol and parse to number
 * @param formattedString String like "₦1,234.50" or "1,234.50"
 * @returns Parsed number or 0 if invalid
 */
export function parseNairaAmount(formattedString: string): number {
  const cleaned = formattedString
    .replace(CURRENCY_SYMBOL, '')
    .replace(/,/g, '')
    .trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
