import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addPurchaseItem, togglePurchaseItem, deletePurchaseItem, clearPurchasedItems } from '../db/db';
import { Plus, Minus, Trash2, Check, ClipboardList, StickyNote } from 'lucide-react';

interface PurchaseListViewProps {
  isReadOnly?: boolean;
  onOpenPaywall?: () => void;
}

export const PurchaseListView: React.FC<PurchaseListViewProps> = ({ isReadOnly = false, onOpenPaywall }) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const submittingRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const items =
    useLiveQuery(async () => {
      const all = await db.purchases.toArray();
      return all.sort((a, b) => b.createdAt - a.createdAt);
    }, []) ?? [];

  const pending = items.filter((i) => !i.isPurchased);
  const purchased = items.filter((i) => i.isPurchased);

  const handleAdd = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (submittingRef.current) return;
    if (!name.trim()) return;
    if (isReadOnly) {
      onOpenPaywall?.();
      return;
    }
    submittingRef.current = true;
    try {
      await addPurchaseItem(name, quantity, note);
      setName('');
      setQuantity(1);
      setNote('');
      setShowNote(false);
      nameInputRef.current?.focus();
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleAdd}
        className="bg-white rounded-[16px] p-3.5 border border-black/[0.06] shadow-xs space-y-2.5"
      >
        <input
          ref={nameInputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Item name (e.g. iPhone 11 Display)"
          className="w-full bg-[#F2F2F7] rounded-[12px] px-3.5 py-2.5 text-[14px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 bg-[#F2F2F7] px-1.5 py-0.5 rounded-full border border-black/[0.04]">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-gray-700 active:scale-95"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-extrabold text-xs text-black min-w-[24px] text-center select-none">{quantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-gray-700 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowNote((s) => !s)}
            className="text-xs font-medium text-gray-500 flex items-center space-x-1 py-1"
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>{showNote ? 'Hide note' : 'Add note'}</span>
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="bg-iosBlue text-white text-[13px] font-semibold px-4 py-2 rounded-full disabled:opacity-40 active:scale-95 transition-all flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
        {showNote && (
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (e.g. vendor name, urgent)"
            className="w-full bg-[#F2F2F7] rounded-[12px] px-3.5 py-2 text-[13px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
          />
        )}
      </form>

      {items.length === 0 ? (
        <div className="bg-white rounded-[16px] p-8 text-center border border-black/[0.04] shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-iosBlue flex items-center justify-center mx-auto">
            <ClipboardList className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-black">Your purchase list is empty</h3>
          <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
            Add items you need to restock or buy from distributors.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {pending.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-[14px] px-3.5 py-3 border border-black/[0.06] shadow-xs flex items-center gap-3"
              >
                <button
                  type="button"
                  aria-label={`Mark ${item.name} as purchased`}
                  onClick={() => togglePurchaseItem(item.id!, true)}
                  className="w-6 h-6 rounded-full border-2 border-gray-300 shrink-0 active:scale-95"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[15px] text-black break-words">{item.name}</div>
                  {item.note && <div className="text-[11px] text-gray-400 break-words">{item.note}</div>}
                </div>
                <span className="text-xs font-bold text-iosBlue bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
                  x{item.quantity}
                </span>
                <button
                  type="button"
                  aria-label={`Delete ${item.name}`}
                  onClick={() => deletePurchaseItem(item.id!)}
                  className="p-1.5 text-iosRed shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {purchased.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between pt-1">
                <span className="text-[12px] font-bold uppercase tracking-wider text-gray-500">
                  Purchased ({purchased.length})
                </span>
                <button
                  type="button"
                  onClick={() => clearPurchasedItems()}
                  className="text-xs font-semibold text-iosRed"
                >
                  Clear all purchased
                </button>
              </div>
              {purchased.map((item) => (
                <div
                  key={item.id}
                  className="bg-white/70 rounded-[14px] px-3.5 py-3 border border-black/[0.04] flex items-center gap-3 opacity-60"
                >
                  <button
                    type="button"
                    aria-label={`Mark ${item.name} as not purchased`}
                    onClick={() => togglePurchaseItem(item.id!, false)}
                    className="w-6 h-6 rounded-full bg-iosGreen text-white flex items-center justify-center shrink-0"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                  <div className="min-w-0 flex-1 font-semibold text-[14px] text-black line-through break-words">
                    {item.name}
                  </div>
                  <span className="text-xs font-bold text-gray-500 shrink-0">x{item.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Delete ${item.name}`}
                    onClick={() => deletePurchaseItem(item.id!)}
                    className="p-1.5 text-iosRed shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
