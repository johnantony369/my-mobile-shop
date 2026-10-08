import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BottomSheet } from '../components/BottomSheet';
import { SegmentedControl } from '../components/SegmentedControl';
import { Entry, EntryType, PaymentMethod, Language, StockItem, Bill } from '../types';
import { t } from '../i18n';
import { db, adjustStockQuantity, createBillForEntry, getBillForEntry } from '../db/db';
import { getLocalDateString } from '../utils/date';
import { buildBillText, buildWhatsAppUrl } from '../utils/billing';
import { shareSummary } from '../utils/share';
import { StockPickerSheet } from '../components/StockPickerSheet';
import { SparesAutoSuggest } from '../components/wholesale/SparesAutoSuggest';
import { Package, X, Check, Trash2, Receipt, Share2, Download } from 'lucide-react';
import { downloadBillPDF } from '../utils/pdf';
import { syncDayBookCreditEntry, removeDayBookCreditSync, formatCurrencyINR } from '../utils/wholesaleCredit';

interface AddEditSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (savedDate?: string) => void;
  onDelete?: (entry: Entry) => void;
  entryToEdit: Entry | null;
  defaultDate: string;
  shopName?: string;
  shopAddress?: string;
  language: Language;
  isReadOnly?: boolean;
}

export function validateCreditEntry(
  type: string,
  paymentMethod: string,
  customerName?: string
): string | null {
  if (type === 'in' && paymentMethod === 'credit' && (!customerName || !customerName.trim())) {
    return 'Customer name is required for credit entries';
  }
  return null;
}

export const AddEditSheet: React.FC<AddEditSheetProps> = ({
  isOpen,
  onClose,
  onSaved,
  onDelete,
  entryToEdit,
  defaultDate,
  shopName,
  shopAddress,
  language,
  isReadOnly = false,
}) => {
  const settings = useLiveQuery(() => db.settings.toCollection().first());
  const effectiveShopName = shopName || settings?.shopName || 'My Mobile Shop';
  const effectiveShopAddress = shopAddress || settings?.shopAddress;

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

  // Billing states
  const [activeBill, setActiveBill] = useState<Bill | null>(null);
  const [isGeneratingBill, setIsGeneratingBill] = useState(false);
  const [showBillPreview, setShowBillPreview] = useState(false);

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

  // Wholesale clients state & query
  const [selectedClientCloudId, setSelectedClientCloudId] = useState<string | undefined>(undefined);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const registeredClients = useLiveQuery(
    async () => {
      try {
        if (!db.clients) return [];
        return await db.clients.toArray();
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

        // Check if a bill already exists for this entry
        if (entryToEdit.id && entryToEdit.type === 'in') {
          getBillForEntry(entryToEdit.id)
            .then((b) => setActiveBill(b || null))
            .catch(() => setActiveBill(null));
        } else {
          setActiveBill(null);
        }

        // Check if a client transaction is linked
        if (entryToEdit.id) {
          db.clientTransactions
            .where('dayBookEntryId')
            .equals(entryToEdit.id)
            .first()
            .then((tx) => {
              if (tx) setSelectedClientCloudId(tx.clientCloudId);
              else setSelectedClientCloudId(undefined);
            })
            .catch(() => setSelectedClientCloudId(undefined));
        } else {
          setSelectedClientCloudId(undefined);
        }
      } else {
        // Reset defaults
        setType('in');
        setAmountStr('');
        setPaymentMethod('cash');
        setItem('');
        setCustomerName('');
        setSelectedClientCloudId(undefined);
        setNote('');
        setDate(defaultDate || getLocalDateString());
        setSelectedStockItem(null);
        setDeductStock(true);
        setActiveBill(null);
      }
      setShowClientDropdown(false);
      setShowBillPreview(false);
      setIsGeneratingBill(false);
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

  const handleGenerateBill = async () => {
    if (!entryToEdit || !entryToEdit.id || isGeneratingBill) return;
    setIsGeneratingBill(true);
    try {
      // If a bill already exists, just show its preview
      if (activeBill) {
        setShowBillPreview(true);
        setIsGeneratingBill(false);
        return;
      }

      // Generate new bill for current entry
      const bill = await createBillForEntry(entryToEdit);
      setActiveBill(bill);
      setShowBillPreview(true);
      // Update note in current form to reflect invoice number
      if (entryToEdit.note) {
        setNote(`${entryToEdit.note} · ${bill.invoiceNo}`);
      } else {
        setNote(bill.invoiceNo);
      }
      onSaved(date);
    } catch (err) {
      console.error('Failed to generate bill:', err);
      setError('Error generating bill');
    } finally {
      setIsGeneratingBill(false);
    }
  };

  const handleShareBill = async () => {
    if (!activeBill) return;
    const text = buildBillText(activeBill, effectiveShopName, effectiveShopAddress);
    if (activeBill.customerPhone) {
      window.open(buildWhatsAppUrl(text, activeBill.customerPhone), '_blank');
    } else {
      await shareSummary(text, `Bill ${activeBill.invoiceNo}`);
    }
  };

  const handleDownloadPDF = () => {
    if (!activeBill) return;
    downloadBillPDF({
      bill: activeBill,
      shopName: effectiveShopName,
      shopAddress: effectiveShopAddress,
      shopPhone: settings?.shopPhone,
      shopLogo: settings?.shopLogo,
    });
  };

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

    const creditError = validateCreditEntry(type, paymentMethod, customerName);
    if (creditError) {
      setError(creditError);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    try {
      let savedId = entryToEdit?.id;
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
        savedId = (await db.entries.add({
          type,
          amount: parsedAmount,
          item: item.trim() || undefined,
          customerName: customerName.trim() || undefined,
          note: note.trim() || undefined,
          paymentMethod: type === 'in' ? paymentMethod : undefined,
          date,
          createdAt: Date.now(),
        })) as number;

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

      // Sync wholesale client credit ledger
      if (
        settings?.wholesaleMode ||
        selectedClientCloudId ||
        paymentMethod === 'credit' ||
        entryToEdit?.paymentMethod === 'credit'
      ) {
        const savedEntry: Entry = {
          id: savedId,
          type,
          amount: parsedAmount,
          item: item.trim() || undefined,
          customerName: customerName.trim() || undefined,
          note: note.trim() || undefined,
          paymentMethod: type === 'in' ? paymentMethod : undefined,
          date,
          createdAt: entryToEdit?.createdAt || Date.now(),
        };
        await syncDayBookCreditEntry(selectedClientCloudId, savedEntry, entryToEdit || undefined);
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
      onClose={() => {
        setShowBillPreview(false);
        onClose();
      }}
      title={
        showBillPreview && activeBill
          ? `Bill ${activeBill.invoiceNo}`
          : entryToEdit
          ? t('edit_entry_title', language)
          : t('new_entry_title', language)
      }
      footer={
        showBillPreview && activeBill ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleShareBill}
              className="flex-1 h-12 rounded-[12px] font-semibold text-[15px] text-white bg-[#25D366] active:opacity-85 flex items-center justify-center space-x-1.5 shadow-md shadow-[#25D366]/20 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Bill</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex-1 h-12 rounded-[12px] font-semibold text-[15px] text-white bg-slate-800 active:opacity-85 flex items-center justify-center space-x-1.5 shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>PDF Bill</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowBillPreview(false);
                onClose();
              }}
              className="px-4 h-12 rounded-[12px] font-semibold text-[15px] bg-[#E5E5EA] text-black active:opacity-85 transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Generate Bill / View Bill Button for In Entries */}
            {entryToEdit && type === 'in' && (
              <button
                type="button"
                onClick={handleGenerateBill}
                disabled={isReadOnly || isGeneratingBill}
                className="w-full h-11 rounded-[12px] font-semibold text-[15px] bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border border-emerald-300 hover:from-emerald-100 hover:to-teal-100 active:scale-98 transition-all flex items-center justify-center space-x-2"
              >
                <Receipt className="w-4 h-4 text-emerald-700" />
                <span>
                  {isGeneratingBill
                    ? 'Generating Bill...'
                    : activeBill
                    ? `View / Share Bill (${activeBill.invoiceNo})`
                    : 'Generate Bill'}
                </span>
              </button>
            )}

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
          </div>
        )
      }
    >
      {showBillPreview && activeBill ? (
        <div className="space-y-3 pt-1 pb-2 animate-fade-in">
          <div className="bg-emerald-50 text-emerald-800 rounded-[10px] p-3 text-xs sm:text-sm font-medium border border-emerald-200/80 flex items-center justify-between">
            <span>Bill generated & linked to this entry.</span>
            <span className="font-bold text-emerald-900">{activeBill.invoiceNo}</span>
          </div>
          <pre className="whitespace-pre-wrap text-[13px] sm:text-[14px] text-black bg-[#F2F2F7] rounded-[12px] p-3.5 font-sans border border-black/[0.04] leading-relaxed">
            {buildBillText(activeBill, effectiveShopName, effectiveShopAddress)}
          </pre>
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setShowBillPreview(false)}
              className="text-xs text-iosBlue hover:underline font-semibold"
            >
              ← Back to Entry Details
            </button>
          </div>
        </div>
      ) : (
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
                { value: 'credit', label: 'Credit' },
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

          {settings?.wholesaleMode ? (
            <SparesAutoSuggest
              value={item}
              onChange={(val) => {
                setItem(val);
                if (selectedStockItem && selectedStockItem.name !== val) {
                  setSelectedStockItem(null);
                }
              }}
              onSelectPart={(part) => {
                if (part.wholesalePrice && !amountStr) {
                  setAmountStr(part.wholesalePrice.toString());
                }
              }}
              placeholder="Enter item or select spare part..."
              disabled={isReadOnly}
            />
          ) : (
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
          )}

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

        {/* 5. Customer Name (Required if Credit, Optional otherwise) */}
        <div className="space-y-1 relative">
          <label className="text-xs font-medium text-[#8E8E93] ml-1 flex items-center justify-between">
            <span>
              {settings?.wholesaleMode ? 'Client Shop / Technician Name' : t('customer_label', language)}
              {type === 'in' && paymentMethod === 'credit' && (
                <span className="text-amber-600 font-bold ml-1">* (Required for Credit)</span>
              )}
            </span>
            {selectedClientCloudId && (
              <button
                type="button"
                onClick={() => {
                  setSelectedClientCloudId(undefined);
                  setCustomerName('');
                }}
                className="text-[11px] text-iosBlue hover:underline font-semibold"
              >
                Clear Client
              </button>
            )}
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => {
              setCustomerName(e.target.value);
              setShowClientDropdown(true);
            }}
            onFocus={() => setShowClientDropdown(true)}
            placeholder={
              settings?.wholesaleMode
                ? 'Enter client shop name or select client...'
                : t('customer_placeholder', language)
            }
            disabled={isReadOnly}
            className="w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-[15px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
          />

          {/* Autocomplete dropdown for registered wholesale clients */}
          {showClientDropdown && registeredClients.length > 0 && customerName && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-[12px] shadow-xl border border-black/[0.08] max-h-48 overflow-y-auto z-50 p-1 space-y-0.5">
              {registeredClients
                .filter(
                  (c) =>
                    c.shopName.toLowerCase().includes(customerName.toLowerCase().trim()) ||
                    (c.contactPerson && c.contactPerson.toLowerCase().includes(customerName.toLowerCase().trim())) ||
                    c.phone.includes(customerName.trim())
                )
                .slice(0, 5)
                .map((c) => (
                  <button
                    key={c.cloudId}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setCustomerName(c.shopName);
                      setSelectedClientCloudId(c.cloudId);
                      setShowClientDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-[8px] hover:bg-[#F2F2F7] flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <span className="font-bold text-black block">{c.shopName}</span>
                      {c.contactPerson && (
                        <span className="text-[11px] text-[#8E8E93] block">
                          {c.contactPerson} • {c.phone}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-bold ${
                        c.currentCreditBalance > 0 ? 'text-iosRed' : 'text-iosGreen'
                      }`}
                    >
                      {c.currentCreditBalance > 0
                        ? `${formatCurrencyINR(c.currentCreditBalance)} Due`
                        : 'Settled'}
                    </span>
                  </button>
                ))}
            </div>
          )}
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

        {/* 7. Delete Entry Option (Only visible when editing an existing entry) */}
        {entryToEdit && onDelete && (
          <div className="pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={async () => {
                const target = entryToEdit;
                await removeDayBookCreditSync(target);
                onClose();
                onDelete(target);
              }}
              className="w-full py-2.5 rounded-[12px] bg-red-50 text-iosRed font-semibold text-[14px] border border-red-200/80 hover:bg-red-100 flex items-center justify-center space-x-1.5 active:opacity-75 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t('delete_action', language)} Entry</span>
            </button>
          </div>
        )}
      </form>
      )}

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
