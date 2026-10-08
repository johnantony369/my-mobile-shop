import React, { useState } from 'react';
import { Entry, Language } from '../../../types';
import { formatINR } from '../../../i18n';
import { formatTime } from '../../../utils/date';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Clock,
  Search,
  Edit2,
  Trash2
} from 'lucide-react';

interface WebBookViewProps {
  entries: Entry[];
  selectedDate?: string;
  language?: Language;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onSettleCredit: (entry: Entry) => void;
  onOpenAdd?: (type?: 'in' | 'out') => void;
  isReadOnly?: boolean;
}

export const WebBookView: React.FC<WebBookViewProps> = ({
  entries,
  onEdit,
  onDelete,
  onSettleCredit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out' | 'credit'>('all');

  // Compute KPI metrics
  const totalIn = entries
    .filter((e) => e.type === 'in')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const totalOut = entries
    .filter((e) => e.type === 'out')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const netBalance = totalIn - totalOut;

  const pendingCredit = entries
    .filter((e) => e.paymentMethod === 'credit')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // Filter list
  const filteredEntries = entries.filter((entry) => {
    if (filterType === 'in' && entry.type !== 'in') return false;
    if (filterType === 'out' && entry.type !== 'out') return false;
    if (filterType === 'credit' && entry.paymentMethod !== 'credit') return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (entry.item && entry.item.toLowerCase().includes(q)) ||
      (entry.customerName && entry.customerName.toLowerCase().includes(q)) ||
      (entry.note && entry.note.toLowerCase().includes(q)) ||
      (entry.amount && entry.amount.toString().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* 4-Column KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total In */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sales (In)</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{formatINR(totalIn)}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {entries.filter((e) => e.type === 'in').length} sales logged
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Total Out */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expenses (Out)</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">{formatINR(totalOut)}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {entries.filter((e) => e.type === 'out').length} expenses logged
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Net Flow */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Cash Flow</p>
            <h3 className={`text-2xl font-black mt-1 ${netBalance >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
              {formatINR(netBalance)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Cash in hand delta</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Scale className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Credit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Credit (Udhar)</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{formatINR(pendingCredit)}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Uncollected payments</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Register Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Table Filter & Search Header */}
        <div className="p-4 border-b border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({entries.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('in')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === 'in'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Sales
            </button>
            <button
              type="button"
              onClick={() => setFilterType('out')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === 'out'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Expenses
            </button>
            <button
              type="button"
              onClick={() => setFilterType('credit')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === 'credit'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Credit Udhar
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search entries, customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-5">Time</th>
                <th className="py-3 px-5">Transaction Details</th>
                <th className="py-3 px-5">Customer / Party</th>
                <th className="py-3 px-5">Payment Mode</th>
                <th className="py-3 px-5 text-right">In (Sale)</th>
                <th className="py-3 px-5 text-right">Out (Expense)</th>
                <th className="py-3 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-600">No transactions recorded for this day</p>
                    <p className="text-xs text-slate-400 mt-1">Use the buttons above to log sales, expenses, or bills.</p>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const isExpense = entry.type === 'out';
                  const timeFormatted = entry.createdAt ? formatTime(entry.createdAt) : '—';
                  return (
                    <tr key={entry.id || entry.cloudId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-5 text-xs text-slate-500 whitespace-nowrap font-medium">
                        {timeFormatted}
                      </td>
                      <td className="py-3 px-5 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{entry.item || (isExpense ? 'Shop Expense' : 'Store Sale')}</span>
                          {entry.repairId && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                              REPAIR
                            </span>
                          )}
                        </div>
                        {entry.note && (
                          <p className="text-xs text-slate-400 font-normal mt-0.5">{entry.note}</p>
                        )}
                      </td>
                      <td className="py-3 px-5 text-xs text-slate-600">
                        {entry.customerName || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                              entry.paymentMethod === 'credit'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300/80'
                                : entry.paymentMethod === 'upi'
                                ? 'bg-blue-50 text-blue-700'
                                : entry.paymentMethod === 'card'
                                ? 'bg-purple-50 text-purple-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {entry.paymentMethod || 'CASH'}
                          </span>
                          {entry.paymentMethod === 'credit' && (
                            <button
                              type="button"
                              onClick={() => onSettleCredit(entry)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-5 text-right font-bold text-emerald-600 whitespace-nowrap">
                        {!isExpense ? formatINR(entry.amount) : '—'}
                      </td>
                      <td className="py-3 px-5 text-right font-bold text-rose-600 whitespace-nowrap">
                        {isExpense ? formatINR(entry.amount) : '—'}
                      </td>
                      <td className="py-3 px-5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEdit(entry)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Transaction"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(entry)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
