import React, { useState } from 'react';
import { X, TrendingUp } from 'lucide-react';
import { WholesaleClient } from '../../types/wholesale';

interface AddCreditSaleModalProps {
  isOpen: boolean;
  client: WholesaleClient;
  onClose: () => void;
  onSave: (amount: number, note: string, date?: string) => Promise<void>;
}

export const AddCreditSaleModal: React.FC<AddCreditSaleModalProps> = ({
  isOpen,
  client,
  onClose,
  onSave,
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) {
      setError('Please enter a valid credit sale amount');
      return;
    }
    if (!note.trim()) {
      setError('Please enter parts taken or bill description');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await onSave(amount, note.trim(), date);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record credit sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-[16px] w-full max-w-sm p-5 shadow-xl border border-black/[0.06] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-iosRed" />
            <h2 className="text-base font-bold text-black tracking-tight">Add Credit Sale</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-black hover:bg-[#F2F2F7] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <span className="text-xs text-slate-500 block">Adding credit sale for:</span>
          <span className="text-sm font-bold text-black block">{client.shopName}</span>
          <span className="text-xs font-semibold text-iosRed mt-0.5 block">
            Current Credit Due: ₹{Math.round(client.currentCreditBalance).toLocaleString('en-IN')}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <div>
            <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1">
              Sale Amount (₹)
            </label>
            <input
              type="number"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="Enter credit sale amount"
              autoFocus
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-lg font-bold text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosRed/40"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1">
              Parts Taken / Note
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter bill description / parts taken"
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-sm font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-sm font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-iosRed hover:bg-red-600 text-white text-xs font-bold rounded-full transition-all shadow-xs disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Credit Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
