import { Entry } from '../types';
import { formatTime } from './date';

export function exportEntriesToCSV(entries: Entry[], filename = 'sales_report.csv'): void {
  const headers = ['Date', 'Time', 'Type', 'Amount (INR)', 'Payment Method', 'Item / Service', 'Customer Name', 'Note'];
  
  const rows = entries.map(e => [
    e.date,
    formatTime(e.createdAt),
    e.type === 'in' ? 'IN (Sale)' : 'OUT (Expense)',
    e.amount.toString(),
    e.type === 'in' ? (e.paymentMethod || 'cash').toUpperCase() : '-',
    `"${(e.item || '').replace(/"/g, '""')}"`,
    `"${(e.customerName || '').replace(/"/g, '""')}"`,
    `"${(e.note || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
