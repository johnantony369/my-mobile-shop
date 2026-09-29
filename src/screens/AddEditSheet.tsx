import React, { useState, useEffect, useRef } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { SegmentedControl } from '../components/SegmentedControl';
import { Entry, EntryType, PaymentMethod, Language } from '../types';
import { t } from '../i18n';
import { db } from '../db/db';
import { getLocalDateString } from '../utils/date';

interface AddEditSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
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
      } else {
        // Reset defaults
        setType('in');
        setAmountStr('');
        setPaymentMethod('cash');
        setItem('');
        setCustomerName('');
        setNote('');
        setDate(defaultDate || getLocalDateString());
      }
      setError(null);

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

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isReadOnly) {
      setError(t('read_only_locked_msg', language));
      return;
    }

    // Clean commas from amount
    const sanitizedAmountStr = amountStr.replace(/,/g, '').trim();
    const parsedAmount = parseFloat(sanitizedAmountStr);

    if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 9999999) {
      setError(t('amount_error', language));
      amountInputRef.current?.focus();
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
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save entry:', err);
      setError('Error saving to local database');
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={entryToEdit ? t('edit_entry_title', language) : t('new_entry_title', language)}
    >
      <form onSubmit={handleSave} className="space-y-4 pt-1">
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

        {/* 4. Optional: Item / Service */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#8E8E93] ml-1">
            {t('item_label', language)}
          </label>
          <input
            type="text"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder={t('item_placeholder', language)}
            disabled={isReadOnly}
            className="w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-[15px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
          />
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

        {/* Submit button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isReadOnly}
            className={`w-full h-12 rounded-[12px] font-semibold text-[16px] text-white transition-opacity ${
              isReadOnly
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-iosBlue active:opacity-85 shadow-md shadow-iosBlue/20'
            }`}
          >
            {entryToEdit ? t('update_btn', language) : t('save_btn', language)}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
};
