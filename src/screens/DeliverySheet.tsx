import React, { useState, useEffect, useRef } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { SegmentedControl } from '../components/SegmentedControl';
import { Job, Language, PaymentMethod } from '../types';
import { t, formatINR } from '../i18n';
import { db } from '../db/db';
import { getLocalDateString } from '../utils/date';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface DeliverySheetProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  language: Language;
  onDelivered: () => void;
}

export const DeliverySheet: React.FC<DeliverySheetProps> = ({
  isOpen,
  onClose,
  job,
  language,
  onDelivered,
}) => {
  const [finalAmountStr, setFinalAmountStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [addToBook, setAddToBook] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && job) {
      const defaultAmt = job.estimate ? job.estimate.toString() : (job.advance || 0).toString();
      setFinalAmountStr(defaultAmt);
      setPaymentMethod('cash');
      setAddToBook(true);
      setError(null);
      isSubmittingRef.current = false;
      setIsSubmitting(false);

      const timer = setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, job]);

  if (!job) return null;

  const sanitizedFinal = finalAmountStr.replace(/,/g, '').trim();
  const parsedFinal = parseFloat(sanitizedFinal) || 0;
  const advance = job.advance || 0;
  const balance = parsedFinal - advance;
  const isNegative = balance < 0;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^[0-9,.]*$/.test(val)) {
      setFinalAmountStr(val);
      if (error) setError(null);
    }
  };

  const handleConfirm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    if (isNaN(parsedFinal) || parsedFinal < 0 || parsedFinal > 9999999) {
      setError(t('amount_error', language));
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    try {
      const today = getLocalDateString();
      let bookEntryId: number | null = null;
      const amountToRecord = advance > 0 ? Math.max(0, parsedFinal - advance) : parsedFinal;

      // If addToBook is checked and amount > 0, create Book entry for the money actually collected today
      if (addToBook && amountToRecord > 0) {
        bookEntryId = await db.entries.add({
          type: 'in',
          amount: amountToRecord,
          paymentMethod,
          item: advance > 0 ? `Repair Balance — ${job.model}` : `Repair — ${job.model}`,
          customerName: job.customerName,
          note: advance > 0 ? `Balance collected (Total: ₹${parsedFinal} - ₹${advance} advance)` : job.complaint,
          repairId: job.id,
          date: today,
          createdAt: Date.now(),
        });
      }

      // Update Job status to 'delivered'
      if (job.id) {
        await db.jobs.update(job.id, {
          status: 'delivered',
          finalAmount: parsedFinal,
          deliveredAt: Date.now(),
          bookEntryId,
        });
      }

      onDelivered();
      onClose();
    } catch (err) {
      console.error('Failed to complete delivery:', err);
      setError('Error saving delivery to database');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={t('delivery_sheet_title', language)}
      footer={
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleConfirm();
          }}
          disabled={isSubmitting}
          className={`w-full h-12 bg-iosGreen text-white rounded-[12px] font-semibold text-[16px] active:opacity-85 shadow-md shadow-iosGreen/20 transition-opacity ${
            isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {t('delivery_confirm_btn', language)}
        </button>
      }
    >
      <form id="delivery-form" onSubmit={(e) => { e.preventDefault(); handleConfirm(e); }} className="space-y-4 pt-1">
        {/* Model & Customer summary */}
        <div className="bg-blue-50/60 rounded-[12px] p-3 border border-blue-100 flex items-center justify-between">
          <div>
            <h4 className="text-[15px] font-bold text-black">{job.model}</h4>
            <span className="text-xs text-[#8E8E93]">{job.customerName}</span>
          </div>
          <span className="text-xs text-iosBlue font-medium">
            {job.phone}
          </span>
        </div>

        {/* 1. Final Amount Field (BIG) */}
        <div className="bg-[#F2F2F7] rounded-[14px] p-3 text-center border border-black/[0.04]">
          <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1">
            {t('field_final_amount', language)}
          </span>
          <div className="flex items-center justify-center space-x-1">
            <span className="text-3xl font-bold text-black select-none">₹</span>
            <input
              ref={amountInputRef}
              type="text"
              inputMode="decimal"
              value={finalAmountStr}
              onChange={handleAmountChange}
              placeholder="0"
              className="text-4xl font-extrabold text-black bg-transparent w-48 text-center focus:outline-none placeholder:text-gray-300"
            />
          </div>
          {error && <p className="text-xs text-iosRed font-medium mt-1">{error}</p>}
        </div>

        {/* Advance & Balance Row */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-white rounded-[10px] p-2.5 border border-black/[0.04] shadow-sm">
            <span className="text-xs text-[#8E8E93] block">
              {t('field_advance', language)}
            </span>
            <span className="text-[16px] font-bold text-black mt-0.5 block">
              {formatINR(advance)}
            </span>
          </div>
          <div className="bg-white rounded-[10px] p-2.5 border border-black/[0.04] shadow-sm">
            <span className="text-xs text-[#8E8E93] block">
              {t('field_balance', language)}
            </span>
            <span
              className={`text-[16px] font-bold mt-0.5 block ${
                isNegative ? 'text-iosRed' : 'text-iosGreen'
              }`}
            >
              {formatINR(Math.max(0, balance))}
            </span>
          </div>
        </div>

        {/* Warning if advance > final */}
        {isNegative && (
          <div className="p-2.5 bg-red-50 text-iosRed rounded-[10px] text-xs font-medium flex items-center space-x-1.5 border border-red-200">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{t('negative_balance_warning', language)}</span>
          </div>
        )}

        {/* 2. Payment Method Segmented Control */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#8E8E93] ml-1">
            {t('payment_method_label', language)}
          </label>
          <SegmentedControl<PaymentMethod>
            value={paymentMethod}
            onChange={(val) => setPaymentMethod(val)}
            size="md"
            options={[
              { value: 'cash', label: t('cash', language) },
              { value: 'upi', label: t('upi', language) },
              { value: 'card', label: t('card', language) },
            ]}
          />
        </div>

        {/* 3. Add to Book Checkbox (default ON) */}
        <label className="flex items-center space-x-3 p-3 bg-white rounded-[12px] border border-black/[0.04] cursor-pointer shadow-sm">
          <input
            type="checkbox"
            checked={addToBook}
            onChange={(e) => setAddToBook(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-iosBlue focus:ring-iosBlue"
          />
          <div className="flex-1">
            <span className="text-[15px] font-semibold text-black block">
              {advance > 0
                ? `Add balance (${formatINR(Math.max(0, balance))}) to Book`
                : t('add_to_book_checkbox', language)}
            </span>
            <span className="text-xs text-[#8E8E93]">
              {advance > 0
                ? `Advance of ${formatINR(advance)} was already recorded earlier`
                : `${t('summary_in', language)} (${paymentMethod.toUpperCase()})`}
            </span>
          </div>
          <CheckCircle2 className={`w-5 h-5 ${addToBook ? 'text-iosBlue' : 'text-gray-300'}`} />
        </label>
      </form>
    </BottomSheet>
  );
};
