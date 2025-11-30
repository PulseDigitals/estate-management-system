/**
 * Format a number as Nigerian Naira currency
 * @param amount - The amount to format
 * @param showSymbol - Whether to show the ₦ symbol (default: true)
 * @returns Formatted currency string
 */
export function formatNaira(amount: number | string, showSymbol: boolean = true): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const formatted = numAmount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return showSymbol ? `₦${formatted}` : formatted;
}

/**
 * Parse a Naira amount string to a number
 * @param amount - The amount string to parse
 * @returns Parsed number
 */
export function parseNaira(amount: string): number {
  return parseFloat(amount.replace(/[₦,]/g, ''));
}
