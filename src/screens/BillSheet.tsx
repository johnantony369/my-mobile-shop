import React, { useEffect, useState, useRef } from 'react';
import { Minus, Plus, Trash2, Package, Share2, Download } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BottomSheet } from '../components/BottomSheet';
import { SegmentedControl } from '../components/SegmentedControl';
import { StockPickerSheet } from '../components/StockPickerSheet';
import { createBill, db } from '../db/db';
import { formatINR } from '../i18n';
import { Bill, BillItem, Language, PaymentMethod, StockItem } from '../types';
import { buildBillText, buildWhatsAppUrl, computeBillTotals } from '../utils/billing';
import { shareSummary } from '../utils/share';
import { downloadBillPDF } from '../utils/pdf';

interface BillSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate: string;
  shopName: string;
  shopAddress?: string;
  language: Language;
}

const inputCls =
  'w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-[15px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]';

export const BillSheet: React.FC<BillSheetProps> = ({
  isOpen,
  onClose,
  defaultDate,
  shopName,
  shopAddress,
  language,
}) => {
  const settings = useLiveQuery(() => db.settings.toCollection().first());
  const effectiveShopName = shopName || settings?.shopName || 'My Mobile Shop';
  const effectiveShopAddress = shopAddress || settings?.shopAddress;
  const [items, setItems] = useState<BillItem[]>([]);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [discountStr, setDiscountStr] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [savedBill, setSavedBill] = useState<Bill | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setItems([]);
      setCustomName('');
      setCustomPrice('');
      setDiscountStr('');
      setCustomerName('');
      setCustomerPhone('');
      setPaymentMethod('cash');
      setError('');
      setSavedBill(null);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const discount = parseFloat(discountStr) || 0;
  const { subtotal, total } = computeBillTotals(items, discount);

  const addFromStock = (si: StockItem) => {
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.stockId === si.id);
      if (idx >= 0) {
        return prev.map((p, i) => (i === idx ? { ...p, qty: p.qty + 1 } : p));
      }
      return [...prev, { name: si.name, qty: 1, price: si.sellingPrice, stockId: si.id }];
    });
    setPickerOpen(false);
  };

  const addCustom = () => {
    const price = parseFloat(customPrice);
    if (!customName.trim() || !(price > 0)) {
      setError('Enter item name and price');
      return;
    }
    setItems((prev) => [...prev, { name: customName.trim(), qty: 1, price }]);
    setCustomName('');
    setCustomPrice('');
    setError('');
  };

  const changeQty = (index: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((p, i) => (i === index ? { ...p, qty: p.qty + delta } : p))
        .filter((p) => p.qty > 0)
    );
  };

  const handleConfirm = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    if (items.length === 0) {
      setError('Add at least one item');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }
    if (total <= 0) {
      setError('Total must be greater than zero');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }
    try {
      const bill = await createBill({
        items,
        discount,
        customerName,
        customerPhone,
        paymentMethod,
        date: defaultDate,
      });
      setSavedBill(bill);
    } catch (err) {
      console.error('Failed to save bill:', err);
      setError('Error saving bill');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (!savedBill) return;
    const text = buildBillText(savedBill, effectiveShopName, effectiveShopAddress);
    if (savedBill.customerPhone) {
      window.open(buildWhatsAppUrl(text, savedBill.customerPhone), '_blank');
    } else {
      await shareSummary(text, `Bill ${savedBill.invoiceNo}`);
    }
  };

  const handleDownloadPDF = () => {
    if (!savedBill) return;
    downloadBillPDF({
      bill: savedBill,
      shopName: effectiveShopName,
      shopAddress: effectiveShopAddress,
    });
  };

  const footer = savedBill ? (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={handleShare}
        className="flex-1 h-12 rounded-[12px] font-semibold text-[15px] text-white bg-[#25D366] active:opacity-85 flex items-center justify-center space-x-1.5 shadow-sm"
      >
        <Share2 className="w-4 h-4" />
        <span>Share Bill</span>
      </button>
      <button
        type="button"
        onClick={handleDownloadPDF}
        className="flex-1 h-12 rounded-[12px] font-semibold text-[15px] text-white bg-slate-800 active:opacity-85 flex items-center justify-center space-x-1.5 shadow-sm"
      >
        <Download className="w-4 h-4" />
        <span>PDF Bill</span>
      </button>
      <button
        type="button"
        onClick={onClose}
        className="px-4 h-12 rounded-[12px] font-semibold text-[15px] bg-[#E5E5EA] text-black active:opacity-85"
      >
        Done
      </button>
    </div>
  ) : (
    <button
      type="button"
      onClick={handleConfirm}
      disabled={isSubmitting}
      className={`w-full h-12 rounded-[12px] font-semibold text-[16px] text-white bg-iosBlue active:opacity-85 shadow-md shadow-iosBlue/20 ${
        isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
      }`}
    >
      Confirm Bill · {formatINR(total)}
    </button>
  );

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={savedBill ? `Bill ${savedBill.invoiceNo}` : 'New Bill'} footer={footer}>
      {savedBill ? (
        <div className="space-y-3 pt-1 pb-2">
          <div className="bg-green-50 text-green-800 rounded-[10px] p-3 text-sm font-medium">
            Bill saved and added to Day Book.
          </div>
          <pre className="whitespace-pre-wrap text-[14px] text-black bg-[#F2F2F7] rounded-[12px] p-3 font-sans">
            {buildBillText(savedBill, effectiveShopName, effectiveShopAddress)}
          </pre>
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">Items</span>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="text-xs font-semibold text-iosBlue flex items-center space-x-1 active:opacity-75"
              >
                <Package className="w-3.5 h-3.5" />
                <span>Pick from Stock</span>
              </button>
            </div>

            {items.length === 0 && (
              <p className="text-sm text-[#8E8E93] py-2">No items yet. Pick from stock or add a custom item below.</p>
            )}

            {items.map((it, i) => (
              <div key={`${it.name}-${i}`} className="flex items-center justify-between bg-[#F2F2F7] rounded-[10px] px-3 py-2">
                <div className="min-w-0 pr-2">
                  <div className="text-[14px] font-semibold truncate">{it.name}</div>
                  <div className="text-xs text-[#8E8E93]">{formatINR(it.price)} each</div>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <button type="button" onClick={() => changeQty(i, -1)} className="w-7 h-7 rounded-full bg-white flex items-center justify-center active:scale-95" aria-label="Decrease">
                    {it.qty === 1 ? <Trash2 className="w-3.5 h-3.5 text-iosRed" /> : <Minus className="w-3.5 h-3.5" />}
                  </button>
                  <span className="w-5 text-center text-[14px] font-semibold">{it.qty}</span>
                  <button type="button" onClick={() => changeQty(i, 1)} className="w-7 h-7 rounded-full bg-white flex items-center justify-center active:scale-95" aria-label="Increase">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-16 text-right text-[14px] font-bold">{formatINR(it.qty * it.price)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Custom item */}
          <div className="flex gap-2">
            <input className={inputCls} placeholder="Custom item" value={customName} onChange={(e) => setCustomName(e.target.value)} />
            <input className={`${inputCls} w-24 shrink-0`} placeholder="₹ Price" inputMode="decimal" value={customPrice} onChange={(e) => setCustomPrice(e.target.value.replace(/[^0-9.]/g, ''))} />
            <button type="button" onClick={addCustom} className="shrink-0 w-11 rounded-[10px] bg-iosBlue text-white flex items-center justify-center active:opacity-85" aria-label="Add custom item">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Discount & totals */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-[#8E8E93]">Discount (₹)</span>
            <input className={`${inputCls} w-28 text-right`} placeholder="0" inputMode="decimal" value={discountStr} onChange={(e) => setDiscountStr(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          <div className="flex items-center justify-between text-sm text-[#8E8E93]">
            <span>Subtotal</span>
            <span>{formatINR(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatINR(total)}</span>
          </div>

          {/* Payment */}
          <SegmentedControl<PaymentMethod>
            value={paymentMethod}
            onChange={(v) => setPaymentMethod(v)}
            size="sm"
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'upi', label: 'UPI' },
              { value: 'card', label: 'Card' },
              { value: 'credit', label: 'Credit' },
            ]}
          />

          {/* Customer (optional) */}
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} placeholder="Customer (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <input className={inputCls} placeholder="WhatsApp no. (optional)" inputMode="numeric" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
          </div>

          {error && <p className="text-xs text-iosRed font-medium">{error}</p>}
        </div>
      )}

      <StockPickerSheet
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addFromStock}
        language={language}
        title="Select Product or Service"
      />
    </BottomSheet>
  );
};
