import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BottomSheet } from '../components/BottomSheet';
import { SegmentedControl } from '../components/SegmentedControl';
import { Entry, EntryType, PaymentMethod, Language, StockItem } from '../types';
import { t } from '../i18n';
import { db, adjustStockQuantity } from '../db/db';
import { getLocalDateString } from '../utils/date';
import { StockPickerSheet } from '../components/StockPickerSheet';
import { Package, X, Check } from 'lucide-react';

interface AddEditSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (savedDate?: string) => void;
  entryToEdit: Entry | null;
  defaultDate: string;
  language: Language;
  isReadOnly?: boolean;
}

export const AddEditSheet: React.FC<AddEditSheetProps> = ({
  isOpen,
  onClose,
  onSaved,
  entryToEdit,
  defaultDate,
  language,
  isReadOnly = false,
}) => {
  const [type, setType] = useState<EntryType>('in');
  const [amountStr, setAmountStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [item, setItem] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(defaultDate || getLocalDateString());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // Stock selection state
  const [isStockPickerOpen, setIsStockPickerOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
  const [deductStock, setDeductStock] = useState(true);

  // Live query for active stock items
  const stockItems = useLiveQuery(
    async () => {
      try {
        if (!db.stock) return [];
        const items = await db.stock.toArray();
        return items.filter((i) => !i.deletedAt && i.syncStatus !== 'deleted');
      } catch {
        return [];
      }
    },
    []
  ) ?? [];

  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (entryToEdit) {
        setType(entryToEdit.type);
        setAmountStr(entryToEdit.amount.toString());
        setPaymentMethod(entryToEdit.paymentMethod || 'cash');
        setItem(entryToEdit.item || '');
        setCustomerName(entryToEdit.customerName || '');
        setNote(entryToEdit.note || '');
        setDate(entryToEdit.date);
        setSelectedStockItem(null);
        setDeductStock(false);
      } else {
        // Reset defaults
        setType('in');
        setAmountStr('');
        setPaymentMethod('cash');
        setItem('');
        setCustomerName('');
        setNote('');
        setDate(defaultDate || getLocalDateString());
        setSelectedStockItem(null);
        setDeductStock(true);
      }
      setError(null);
      isSubmittingRef.current = false;
      setIsSubmitting(false);

      // Auto-focus amount field
      const timer = setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, entryToEdit, defaultDate]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow digits, commas, and a single decimal point
    if (/^[0-9,.]*$/.test(val)) {
      setAmountStr(val);
      if (error) setError(null);
    }
  };

  const handleSelectStockItem = (stockItem: StockItem) => {
    setSelectedStockItem(stockItem);
    setItem(stockItem.name);
    setAmountStr(stockItem.sellingPrice.toString());
    if (stockItem.notes && !note) {
      setNote(stockItem.notes);
    }
    if (error) setError(null);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    if (isReadOnly) {
      setError(t('read_only_locked_msg', language));
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    // Clean commas from amount
    const sanitizedAmountStr = amountStr.replace(/,/g, '').trim();
    const parsedAmount = parseFloat(sanitizedAmountStr);

    if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 9999999) {
      setError(t('amount_error', language));
      amountInputRef.current?.focus();
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    try {
      if (entryToEdit && entryToEdit.id) {
        await db.entries.update(entryToEdit.id, {
          type,
          amount: parsedAmount,
          item: item.trim() || undefined,
          customerName: customerName.trim() || undefined,
          note: note.trim() || undefined,
          paymentMethod: type === 'in' ? paymentMethod : undefined,
          date,
        });
      } else {
        await db.entries.add({
          type,
          amount: parsedAmount,
          item: item.trim() || undefined,
          customerName: customerName.trim() || undefined,
          note: note.trim() || undefined,
          paymentMethod: type === 'in' ? paymentMethod : undefined,
          date,
          createdAt: Date.now(),
        });

        // Deduct inventory quantity if product and option checked
        if (
          type === 'in' &&
          selectedStockItem &&
          selectedStockItem.category === 'product' &&
          deductStock &&
          selectedStockItem.id
        ) {
          await adjustStockQuantity(selectedStockItem.id, -1);
        }
      }

      onSaved(date);
      onClose();
    } catch (err) {
      console.error('Failed to save entry:', err);
      setError('Error saving to local database');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={entryToEdit ? t('edit_entry_title', language) : t('new_entry_title', language)}
      footer={
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleSave();
          }}
          disabled={isReadOnly || isSubmitting}
          className={`w-full h-12 rounded-[12px] font-semibold text-[16px] text-white transition-opacity ${
            isReadOnly || isSubmitting
              ? 'bg-gray-400 cursor-not-allowed opacity-70'
              : 'bg-iosBlue active:opacity-85 shadow-md shadow-iosBlue/20'
          }`}
        >
          {entryToEdit ? t('update_btn', language) : t('save_btn', language)}
        </button>
      }
    >
      <form id="add-entry-form" onSubmit={(e) => { e.preventDefault(); handleSave(e); }} className="space-y-4 pt-1">
        {isReadOnly && (
          <div className="bg-red-50 text-iosRed p-3 rounded-[10px] text-xs font-medium">
            {t('read_only_locked_msg', language)}
          </div>
        )}

        {/* 1. Large Amount Field FIRST */}
        <div className="bg-[#F2F2F7] rounded-[14px] p-3 text-center border border-black/[0.04]">
          <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1">
            {t('amount_label', language)}
          </span>
          <div className="flex items-center justify-center space-x-1">
            <span className="text-3xl font-bold text-black select-none">₹</span>
            <input
              ref={amountInputRef}
              type="text"
              inputMode="decimal"
              value={amountStr}
              onChange={handleAmountChange}
              placeholder="0"
              disabled={isReadOnly}
              className="text-4xl font-extrabold text-black bg-transparent w-48 text-center focus:outline-none placeholder:text-gray-300"
            />
          </div>
          {error && <p className="text-xs text-iosRed font-medium mt-1">{error}</p>}
        </div>

        {/* 2. Type Segmented Control (In / Out) */}
        <div>
          <SegmentedControl<EntryType>
            value={type}
            onChange={(val) => setType(val)}
            size="md"
            options={[
              { value: 'in', label: t('type_in_label', language) },
              { value: 'out', label: t('type_out_label', language) },
            ]}
          />
        </div>

        {/* 3. Payment Method (If In) */}
        {type === 'in' && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#8E8E93] ml-1">
              {t('payment_method_label', language)}
            </label>
            <SegmentedControl<PaymentMethod>
              value={paymentMethod}
              onChange={(val) => setPaymentMethod(val)}
              size="sm"
              options={[
                { value: 'cash', label: t('cash', language) },
                { value: 'upi', label: t('upi', language) },
                { value: 'card', label: t('card', language) },
              ]}
            />
          </div>
        )}

        {/* 4. Item / Service with Quick Stock Picker */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between ml-1">
            <label className="text-xs font-semibold text-[#8E8E93]">
              {t('item_label', language)}
            </label>
            <button
              type="button"
              onClick={() => setIsStockPickerOpen(true)}
              className="text-xs font-semibold text-iosBlue hover:underline flex items-center space-x-1 active:opacity-75"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Pick from Stock ({stockItems.length})</span>
            </button>
          </div>

          {/* Quick stock chips if available */}
          {stockItems.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar momentum-scroll overscroll-x-contain touch-pan-x text-xs">
              {stockItems.slice(0, 8).map((si) => {
                const isSelected = selectedStockItem?.id === si.id;
                return (
                  <button
                    key={si.id}
                    type="button"
                    onClick={() => handleSelectStockItem(si)}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all active:scale-95 flex items-center space-x-1 border ${
                      isSelected
                        ? 'bg-iosBlue text-white border-iosBlue shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200/80 hover:border-iosBlue'
                    }`}
                  >

                    <span className="font-semibold">{si.name}</span>
                    <span className={isSelected ? 'text-blue-100' : 'text-gray-400'}>
                      (₹{si.sellingPrice})
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              value={item}
              onChange={(e) => {
                setItem(e.target.value);
                if (selectedStockItem && selectedStockItem.name !== e.target.value) {
                  setSelectedStockItem(null);
                }
              }}
              placeholder={t('item_placeholder', language)}
              disabled={isReadOnly}
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-[15px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
            />
            {item && (
              <button
                type="button"
                onClick={() => {
                  setItem('');
                  setSelectedStockItem(null);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Selected Stock Item details & Stock deduction toggle */}
          {selectedStockItem && (
            <div className="bg-blue-50/80 border border-blue-200 rounded-[10px] p-2.5 flex items-center justify-between text-xs animate-fade-in">
              <div className="flex items-center space-x-2 text-blue-900 min-w-0 pr-1">
                <Check className="w-4 h-4 text-iosBlue shrink-0" />
                <div className="truncate">
                  <span className="font-semibold">
                    Stock: {selectedStockItem.name}
                  </span>
                  <span className="text-gray-500 ml-1">
                    (₹{selectedStockItem.sellingPrice})
                  </span>
                </div>
                {selectedStockItem.category === 'product' && typeof selectedStockItem.quantity === 'number' && (
                  <span className="text-[10px] font-semibold text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                    {selectedStockItem.quantity} left
                  </span>
                )}
              </div>

              {type === 'in' && selectedStockItem.category === 'product' && typeof selectedStockItem.quantity === 'number' && (
                <label className="flex items-center space-x-1.5 text-[11px] text-gray-700 cursor-pointer font-medium shrink-0">
                  <input
                    type="checkbox"
                    checked={deductStock}
                    onChange={(e) => setDeductStock(e.target.checked)}
                    className="rounded text-iosBlue focus:ring-iosBlue"
                  />
                  <span>Deduct 1</span>
                </label>
              )}
            </div>
          )}
        </div>

        {/* 5. Optional: Customer Name */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#8E8E93] ml-1">
            {t('customer_label', language)}
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder={t('customer_placeholder', language)}
            disabled={isReadOnly}
            className="w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-[15px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
          />
        </div>

        {/* 6. Optional: Note & Date row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#8E8E93] ml-1">
              {t('note_label', language)}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('note_placeholder', language)}
              disabled={isReadOnly}
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-[14px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#8E8E93] ml-1">
              {t('date_label', language)}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isReadOnly}
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-[14px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
            />
          </div>
        </div>
      </form>

      {/* Stock Picker Sheet */}
      <StockPickerSheet
        isOpen={isStockPickerOpen}
        onClose={() => setIsStockPickerOpen(false)}
        onSelect={handleSelectStockItem}
        language={language}
        title="Select Product or Service"
      />
    </BottomSheet>
  );
};
