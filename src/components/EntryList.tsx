import React, { useState } from 'react';
import { Entry, Language } from '../types';
import { formatINR, t } from '../i18n';
import { formatTime } from '../utils/date';
import { SwipeableRow } from './SwipeableRow';
import { PlusCircle, ShoppingBag, ArrowUpRight, Clock } from 'lucide-react';
import { db } from '../db/db';
import { syncDayBookCreditEntry } from '../utils/wholesaleCredit';

interface EntryListProps {
  entries: Entry[];
  isToday: boolean;
  language: Language;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onAddClick: () => void;
}

export const EntryList: React.FC<EntryListProps> = ({
  entries,
  isToday,
  language,
  onEdit,
  onDelete,
  onAddClick,
}) => {
  const [settleEntry, setSettleEntry] = useState<Entry | null>(null);
  const [unpaidEntry, setUnpaidEntry] = useState<Entry | null>(null);
  const [unpaidCustomerName, setUnpaidCustomerName] = useState('');
  const [unpaidError, setUnpaidError] = useState<string | null>(null);

  const handleSettle = async (method: 'cash' | 'upi') => {
    if (settleEntry && settleEntry.id) {
      const now = new Date().toISOString();
      await db.entries.update(settleEntry.id, {
        paymentMethod: method,
        updatedAt: now,
        syncStatus: 'pending',
      });

      const updatedEntry: Entry = {
        ...settleEntry,
        paymentMethod: method,
      };
      await syncDayBookCreditEntry(undefined, updatedEntry, settleEntry);

      setSettleEntry(null);
    }
  };

  const handleOpenMarkUnpaid = (entry: Entry) => {
    setUnpaidEntry(entry);
    setUnpaidCustomerName(entry.customerName || '');
    setUnpaidError(null);
  };

  const handleConfirmMarkUnpaid = async () => {
    if (!unpaidEntry || !unpaidEntry.id) return;
    const trimmedCustomer = unpaidCustomerName.trim();
    if (!trimmedCustomer) {
      setUnpaidError('Customer name is required for credit entries');
      return;
    }

    const now = new Date().toISOString();
    await db.entries.update(unpaidEntry.id, {
      paymentMethod: 'credit',
      customerName: trimmedCustomer,
      updatedAt: now,
      syncStatus: 'pending',
    });

    const updatedEntry: Entry = {
      ...unpaidEntry,
      paymentMethod: 'credit',
      customerName: trimmedCustomer,
    };
    await syncDayBookCreditEntry(undefined, updatedEntry, unpaidEntry);

    setUnpaidEntry(null);
    setUnpaidCustomerName('');
    setUnpaidError(null);
  };
  if (entries.length === 0) {
    return (
      <div className="mx-4 my-6 bg-white rounded-[14px] p-8 text-center shadow-sm border border-black/[0.04]">
        <div className="w-14 h-14 bg-blue-50 text-iosBlue rounded-full flex items-center justify-center mx-auto mb-3">
          <ShoppingBag className="w-7 h-7" />
        </div>
        <h3 className="text-[17px] font-semibold text-black">
          {isToday ? t('empty_today', language) : t('empty_day', language)}
        </h3>
        <p className="text-[13px] text-[#8E8E93] mt-1.5 max-w-[260px] mx-auto leading-relaxed">
          {isToday ? t('empty_today_hint', language) : t('empty_day_hint', language)}
        </p>
        <button
          type="button"
          onClick={onAddClick}
          className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 bg-iosBlue text-white text-sm font-semibold rounded-full shadow-sm active:opacity-80 transition-opacity"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('add_entry', language)}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-20 bg-white rounded-[14px] shadow-sm border border-black/[0.04] overflow-hidden">
      {entries.map((entry, index) => {
        const isExpense = entry.type === 'out';
        const title =
          entry.item?.trim() ||
          entry.customerName?.trim() ||
          (isExpense ? t('fallback_expense', language) : t('fallback_sale', language));

        const subtitleParts: string[] = [];
        if (entry.item && entry.customerName) {
          subtitleParts.push(entry.customerName);
        }
        if (entry.note) {
          subtitleParts.push(entry.note);
        }

        return (
          <div
            key={entry.id ?? index}
            className={`${index !== 0 ? 'border-t border-[#E5E5EA]' : ''}`}
          >
            <SwipeableRow
              onEdit={() => onEdit(entry)}
              onDelete={() => onDelete(entry)}
              onTap={() => onEdit(entry)}
              onMarkPaid={
                !isExpense && entry.paymentMethod === 'credit'
                  ? () => setSettleEntry(entry)
                  : undefined
              }
              onMarkUnpaid={
                !isExpense && entry.paymentMethod !== 'credit'
                  ? () => handleOpenMarkUnpaid(entry)
                  : undefined
              }
              editLabel={t('edit_action', language)}
              deleteLabel={t('delete_action', language)}
              markPaidLabel={t('mark_paid_action', language)}
              markUnpaidLabel={t('mark_unpaid_action', language)}
            >
              <div className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-black/[0.015] active:bg-black/[0.04] transition-colors">
                {/* Left side details */}
                <div className="flex-1 min-w-0 pr-2 sm:pr-3">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <span className="text-[15px] font-medium text-black truncate min-w-0">
                      {title}
                    </span>
                    {/* Method Badge & Repair Badge */}
                    {!isExpense ? (
                      <div className="flex items-center space-x-1 shrink-0 whitespace-nowrap">
                        {entry.repairId && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 whitespace-nowrap shrink-0">
                            {t('repair_badge', language)}
                          </span>
                        )}
                        {entry.isExchange && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200/80 whitespace-nowrap shrink-0 flex items-center gap-0.5">
                            <span>⇄</span>
                            <span>EXCH</span>
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap shrink-0 ${
                            entry.paymentMethod === 'credit'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200/80 font-bold'
                              : entry.paymentMethod === 'upi'
                              ? 'bg-blue-50 text-iosBlue'
                              : entry.paymentMethod === 'card'
                              ? 'bg-purple-50 text-purple-600'
                              : 'bg-gray-100 text-[#8E8E93]'
                          }`}
                        >
                          {entry.paymentMethod === 'credit' ? 'CREDIT' : (entry.paymentMethod || 'cash')}
                        </span>
                        {entry.paymentMethod === 'credit' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSettleEntry(entry);
                            }}
                            className="ml-0.5 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300/80 hover:bg-amber-200 active:scale-95 transition-all shadow-2xs whitespace-nowrap shrink-0"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-iosRed flex items-center whitespace-nowrap shrink-0">
                        <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />
                        {t('summary_out', language)}
                      </span>
                    )}
                  </div>

                  {/* Subtitle / time / note */}
                  <div className="flex items-center space-x-2 mt-0.5 text-xs text-[#8E8E93] truncate min-w-0">
                    <span className="shrink-0">{formatTime(entry.createdAt)}</span>
                    {subtitleParts.length > 0 && (
                      <>
                        <span className="shrink-0">•</span>
                        <span className="truncate min-w-0">{subtitleParts.join(' • ')}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right side amount */}
                <div className="text-right flex-shrink-0">
                  <span
                    className={`text-[17px] font-bold tracking-tight ${
                      isExpense ? 'text-iosRed' : 'text-iosGreen'
                    }`}
                  >
                    {isExpense ? '-' : '+'}
                    {formatINR(entry.amount)}
                  </span>
                </div>
              </div>
            </SwipeableRow>
          </div>
        );
      })}

      {/* Quick 1-Tap Settle Payment Modal */}
      {settleEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
          onClick={() => setSettleEntry(null)}
        >
          <div
            className="bg-white rounded-[18px] p-5 w-full max-w-xs shadow-2xl space-y-4 border border-black/[0.04] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-[17px] font-bold text-black">
              Mark as Paid
            </h4>
            <p className="text-xs text-[#8E8E93] leading-relaxed">
              Receive payment of <strong className="text-black font-semibold">{formatINR(settleEntry.amount)}</strong> from <strong className="text-black font-semibold">{settleEntry.customerName || 'Customer'}</strong>
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSettle('cash')}
                className="h-11 rounded-[12px] bg-gray-100 hover:bg-gray-200 active:scale-95 font-semibold text-sm text-black transition-all flex items-center justify-center space-x-1.5"
              >
                <span>Cash</span>
              </button>
              <button
                type="button"
                onClick={() => handleSettle('upi')}
                className="h-11 rounded-[12px] bg-blue-50 text-iosBlue hover:bg-blue-100 active:scale-95 font-semibold text-sm transition-all flex items-center justify-center space-x-1.5"
              >
                <span>UPI</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSettleEntry(null)}
              className="w-full text-xs text-[#8E8E93] hover:text-black font-medium py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Mark as Unpaid (Credit / Udhar) Modal */}
      {unpaidEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
          onClick={() => setUnpaidEntry(null)}
        >
          <div
            className="bg-white rounded-[18px] p-5 w-full max-w-xs shadow-2xl space-y-4 border border-black/[0.04] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-[17px] font-bold text-black">
                {t('mark_unpaid_title', language)}
              </h4>
              <p className="text-xs text-[#8E8E93] leading-relaxed mt-1">
                Mark <strong className="text-black font-semibold">{formatINR(unpaidEntry.amount)}</strong> as Credit (Udhar)
              </p>
            </div>

            <div className="text-left space-y-1">
              <label className="text-xs font-semibold text-gray-700 ml-1">
                {t('customer_label', language)} <span className="text-amber-600">*</span>
              </label>
              <input
                type="text"
                value={unpaidCustomerName}
                onChange={(e) => {
                  setUnpaidCustomerName(e.target.value);
                  if (unpaidError) setUnpaidError(null);
                }}
                placeholder={t('customer_placeholder', language)}
                className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-amber-500/40 border border-black/[0.04]"
                autoFocus
              />
              {unpaidError && <p className="text-xs text-iosRed font-medium ml-1">{unpaidError}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setUnpaidEntry(null)}
                className="h-11 rounded-[12px] bg-gray-100 hover:bg-gray-200 active:scale-95 font-semibold text-sm text-black transition-all"
              >
                {t('cancel_action', language)}
              </button>
              <button
                type="button"
                onClick={handleConfirmMarkUnpaid}
                className="h-11 rounded-[12px] bg-amber-500 hover:bg-amber-600 active:scale-95 font-semibold text-sm text-white transition-all shadow-sm shadow-amber-500/20"
              >
                {t('confirm_action', language)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
