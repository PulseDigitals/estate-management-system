/**
 * CSV Export Utilities
 * Provides functions to convert various data structures to CSV format
 */

/**
 * Converts an array of objects to CSV string
 */
export function convertToCSV(data: Record<string, any>[], headers?: string[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Extract headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);

  // Create header row
  const headerRow = csvHeaders.map(escapeCSVValue).join(',');

  // Create data rows
  const dataRows = data.map(row => {
    return csvHeaders.map(header => {
      const value = row[header];
      return escapeCSVValue(value);
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Escapes a value for CSV format
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If the value contains comma, newline, or quote, wrap it in quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    // Escape quotes by doubling them
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Downloads a CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format currency amount for CSV (removes currency symbol)
 * Safely handles both number and string inputs
 */
export function formatCurrencyForCSV(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '0.00';
  }
  
  const numericAmount = Number(amount);
  
  if (isNaN(numericAmount)) {
    return '0.00';
  }
  
  return numericAmount.toFixed(2);
}

/**
 * Format date for CSV
 */
export function formatDateForCSV(date: string | Date): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD format
}
