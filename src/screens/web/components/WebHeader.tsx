import React from 'react';
import {
  Calendar,
  Cloud,
  CloudCheck,
  CloudOff,
  RefreshCw,
  Plus,
  ArrowUpRight,
  ReceiptText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { SyncState } from '../../../firebase/sync';
import { getLocalDateString } from '../../../utils/date';

interface WebHeaderProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  syncState?: SyncState;
  onSyncClick?: () => void;
  onAddSale: () => void;
  onAddExpense: () => void;
  onOpenBill: () => void;
  isReadOnly?: boolean;
}

export const WebHeader: React.FC<WebHeaderProps> = ({
  selectedDate,
  onDateChange,
  syncState = 'synced',
  onSyncClick,
  onAddSale,
  onAddExpense,
  onOpenBill,
  isReadOnly = false,
}) => {
  const today = getLocalDateString();
  const isToday = selectedDate === today;

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  return (
    <header className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Date Switcher */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
          <button
            type="button"
            onClick={handlePrevDay}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="relative flex items-center px-2.5">
            <Calendar className="w-4 h-4 text-blue-600 mr-2 shrink-0 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && onDateChange(e.target.value)}
              className="text-xs font-bold text-slate-900 bg-transparent cursor-pointer focus:outline-hidden"
            />
          </div>

          <button
            type="button"
            onClick={handleNextDay}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {!isToday && (
          <button
            type="button"
            onClick={() => onDateChange(today)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            Today
          </button>
        )}
      </div>

      {/* Right Action Bar */}
      <div className="flex items-center gap-3">
        {/* Sync Status Badge */}
        <button
          type="button"
          onClick={onSyncClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          title="Click to trigger cloud synchronization"
        >
          {syncState === 'syncing' ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              <span>Syncing...</span>
            </>
          ) : syncState === 'offline' ? (
            <>
              <CloudOff className="w-3.5 h-3.5 text-slate-400" />
              <span>Offline</span>
            </>
          ) : syncState === 'error' ? (
            <>
              <Cloud className="w-3.5 h-3.5 text-red-500" />
              <span className="text-red-600">Sync Error</span>
            </>
          ) : (
            <>
              <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700">Cloud Synced</span>
            </>
          )}
        </button>

        {/* GST / Estimate Bill Generator */}
        <button
          type="button"
          onClick={onOpenBill}
          disabled={isReadOnly}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs active:scale-95 transition-all disabled:opacity-50"
        >
          <ReceiptText className="w-3.5 h-3.5 text-amber-400" />
          <span>New Bill</span>
        </button>

        {/* Expense Button */}
        <button
          type="button"
          onClick={onAddExpense}
          disabled={isReadOnly}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80 active:scale-95 transition-all disabled:opacity-50"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Expense</span>
        </button>

        {/* Sale / Cash In Button */}
        <button
          type="button"
          onClick={onAddSale}
          disabled={isReadOnly}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>Add Sale</span>
        </button>
      </div>
    </header>
  );
};
