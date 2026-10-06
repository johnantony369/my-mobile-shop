import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, createSalonBill } from '../db/db';
import { Appointment, Bill, BillItem, Customer, PaymentMethod } from '../types';
import { formatINR } from '../i18n';
import { BottomSheet } from '../components/BottomSheet';
import { getLocalDateString } from '../utils/date';
import { Plus, Minus, Trash2, Share2, CheckCircle2 } from 'lucide-react';

interface SalonBillSheetProps {
  isOpen: boolean;
  onClose: () => void;
  shopName: string;
  defaultAppointment?: Appointment | null;
  defaultCustomer?: Customer | null;
  onSaved: () => void;
}

export const SalonBillSheet: React.FC<SalonBillSheetProps> = ({
  isOpen,
  onClose,
  shopName,
  defaultAppointment,
  defaultCustomer,
  onSaved,
}) => {
  const [items, setItems] = useState<BillItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountStr, setDiscountStr] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [paidAmountStr, setPaidAmountStr] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<number | ''>('');
  const [savedBill, setSavedBill] = useState<Bill | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableServices = useLiveQuery(async () => {
    try {
      const all = await db.services.toArray();
      return all.filter((s) => !s.deletedAt && s.syncStatus !== 'deleted' && s.active);
    } catch {
      return [];
    }
  }, []) ?? [];

  useEffect(() => {
    if (isOpen) {
      setSavedBill(null);
      setError(null);
      setIsSubmitting(false);

      if (defaultAppointment) {
        setCustomerName(defaultAppointment.customerName || '');
        setCustomerPhone(defaultAppointment.customerPhone || '');
        setItems([
          {
            serviceId: defaultAppointment.serviceId,
            name: defaultAppointment.serviceName,
            qty: 1,
            price: defaultAppointment.price,
            staffName: defaultAppointment.staffName,
          },
        ]);
        setPaidAmountStr(String(defaultAppointment.price));
      } else if (defaultCustomer) {
        setCustomerName(defaultCustomer.name);
        setCustomerPhone(defaultCustomer.phone);
        setItems([]);
        setPaidAmountStr('');
      } else {
        setCustomerName('');
        setCustomerPhone('');
        setItems([]);
        setPaidAmountStr('');
      }
      setDiscountStr('0');
      setPaymentMethod('upi');
      setSelectedServiceId('');
    }
  }, [isOpen, defaultAppointment, defaultCustomer]);

  const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);
  const discount = parseFloat(discountStr) || 0;
  const total = Math.max(0, subtotal - discount);

  // Sync paidAmount when items change if user hasn't explicitly entered a partial amount
  useEffect(() => {
    if (!savedBill) {
      setPaidAmountStr(String(total));
    }
  }, [total, savedBill]);

  const handleAddService = (id: number) => {
    const s = availableServices.find((item) => item.id === id);
    if (!s) return;
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.serviceId === s.id);
      if (idx >= 0) {
        return prev.map((p, i) => (i === idx ? { ...p, qty: p.qty + 1 } : p));
      }
      return [...prev, { serviceId: s.id, name: s.name, qty: 1, price: s.price }];
    });
    setSelectedServiceId('');
  };

  const handleQtyChange = (index: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((p, i) => (i === index ? { ...p, qty: p.qty + delta } : p))
        .filter((p) => p.qty > 0)
    );
  };

  const handleConfirmBill = async () => {
    if (isSubmitting) return;
    if (items.length === 0) {
      setError('Please add at least one service to the bill');
      return;
    }
    const paidAmt = parseFloat(paidAmountStr);
    if (isNaN(paidAmt) || paidAmt < 0) {
      setError('Please enter a valid paid amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const bill = await createSalonBill({
        customerId: defaultCustomer?.id || defaultAppointment?.customerId,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        appointmentId: defaultAppointment?.id,
        items,
        discount,
        paidAmount: paidAmt,
        paymentMethod,
        date: getLocalDateString(),
      });
      setSavedBill(bill);
      onSaved();
    } catch (err) {
      console.error(err);
      setError('Error completing bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateReceiptText = (b: Bill) => {
    const lines = [
      `*${shopName}*`,
      `Receipt: ${b.invoiceNo}`,
      `Date: ${b.date}`,
      b.customerName ? `Client: ${b.customerName}` : '',
      `------------------------`,
      ...b.items.map((it) => `${it.name}${it.qty > 1 ? ` x${it.qty}` : ''} - ₹${it.price * it.qty}`),
      `------------------------`,
      b.discount > 0 ? `Subtotal: ₹${b.subtotal}\nDiscount: ₹${b.discount}` : '',
      `*Total: ₹${b.total}*`,
      `Paid (${b.paymentMethod.toUpperCase()}): ₹${b.paidAmount}`,
      b.balanceAmount > 0 ? `*Balance Due: ₹${b.balanceAmount}*` : 'Payment Status: Fully Paid',
      `\nThank you for visiting ${shopName}!`,
    ].filter(Boolean);
    return lines.join('\n');
  };

  const handleShareReceipt = () => {
    if (!savedBill) return;
    const text = generateReceiptText(savedBill);
    if (savedBill.customerPhone) {
      const clean = savedBill.customerPhone.replace(/\D/g, '');
      const cleanWithCountry = clean.startsWith('91') ? clean : `91${clean}`;
      window.open(`https://wa.me/${cleanWithCountry}?text=${encodeURIComponent(text)}`, '_blank');
    } else if (navigator.share) {
      navigator.share({ title: `Receipt ${savedBill.invoiceNo}`, text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Receipt copied to clipboard!');
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={savedBill ? `Receipt ${savedBill.invoiceNo}` : 'Collect Payment'}
    >
      {savedBill ? (
        <div className="space-y-4 pt-1 select-none">
          <div className="bg-[#EBF7EE] text-[#1E7E34] border border-[#D4EDDA] rounded-[16px] p-4 text-center space-y-1">
            <CheckCircle2 className="w-8 h-8 mx-auto" />
            <h4 className="text-[17px] font-extrabold text-[#1E7E34]">Payment Collected!</h4>
            <p className="text-xs text-[#2E7D32]">
              Receipt {savedBill.invoiceNo} generated & revenue recorded
            </p>
          </div>

          <div className="bg-[#F6F5F3] p-4 rounded-[16px] space-y-2 text-xs font-mono whitespace-pre-wrap">
            {generateReceiptText(savedBill)}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={handleShareReceipt}
              className="py-3 bg-[#25D366] hover:bg-[#20BA5A] active:scale-95 text-white rounded-[14px] text-[13px] font-bold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp Receipt</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3 bg-[#171717] hover:bg-[#2C2C2E] text-white rounded-[14px] text-[13px] font-bold shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          {error && (
            <div className="p-2.5 bg-red-50 text-[#D32F2F] text-xs font-semibold rounded-[10px]">
              {error}
            </div>
          )}

          {/* Client Info */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
                Client Name (Optional)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Anu"
                className="w-full bg-[#F6F5F3] rounded-[10px] px-3 py-2 text-[14px] text-[#171717] border border-black/[0.04] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
                WhatsApp Phone
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="10 digits"
                className="w-full bg-[#F6F5F3] rounded-[10px] px-3 py-2 text-[14px] text-[#171717] border border-black/[0.04] focus:outline-none"
              />
            </div>
          </div>

          {/* Services Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] font-semibold text-[#6B6B6B] block">
                Add Services to Bill
              </label>
            </div>
            <select
              value={selectedServiceId}
              onChange={(e) => {
                if (e.target.value) handleAddService(Number(e.target.value));
              }}
              className="w-full bg-[#F6F5F3] rounded-[10px] px-3 py-2 text-[13px] text-[#171717] border border-black/[0.04] focus:outline-none"
            >
              <option value="">+ Tap to add service from menu...</option>
              {availableServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category}) — {formatINR(s.price)}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Items List */}
          <div className="space-y-2">
            {items.length === 0 ? (
              <p className="text-xs text-[#8E8E93] py-2 text-center bg-[#F6F5F3] rounded-[10px]">
                No services added to bill yet.
              </p>
            ) : (
              items.map((it, idx) => (
                <div
                  key={`${it.name}-${idx}`}
                  className="p-3 bg-[#F6F5F3] rounded-[12px] flex items-center justify-between text-[13px]"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-[#171717] truncate">{it.name}</div>
                    <div className="text-[11px] text-[#8E8E93]">{formatINR(it.price)} each</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQtyChange(idx, -1)}
                      className="w-7 h-7 rounded-full bg-white flex items-center justify-center active:scale-95 shadow-2xs"
                    >
                      {it.qty === 1 ? <Trash2 className="w-3.5 h-3.5 text-[#D32F2F]" /> : <Minus className="w-3.5 h-3.5" />}
                    </button>
                    <span className="w-4 text-center font-bold text-xs">{it.qty}</span>
                    <button
                      type="button"
                      onClick={() => handleQtyChange(idx, 1)}
                      className="w-7 h-7 rounded-full bg-white flex items-center justify-center active:scale-95 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-16 text-right font-black text-[#171717]">
                      {formatINR(it.qty * it.price)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Discount & Totals */}
          <div className="bg-[#F6F5F3] p-3.5 rounded-[16px] space-y-2 text-[13px]">
            <div className="flex items-center justify-between text-[#6B6B6B]">
              <span>Subtotal</span>
              <span className="font-bold text-[#171717]">{formatINR(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-[#6B6B6B]">
              <span>Discount (₹)</span>
              <input
                type="number"
                value={discountStr}
                onChange={(e) => setDiscountStr(e.target.value)}
                placeholder="0"
                className="w-20 text-right bg-white rounded-[8px] px-2 py-1 text-xs border border-black/[0.04] font-bold"
              />
            </div>
            <div className="pt-1.5 border-t border-black/[0.06] flex items-center justify-between text-[16px] font-black text-[#171717]">
              <span>Total Payable</span>
              <span>{formatINR(total)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['upi', 'cash', 'card'] as PaymentMethod[]).map((pm) => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setPaymentMethod(pm)}
                  className={`py-2 rounded-[12px] text-xs font-bold uppercase transition-all ${
                    paymentMethod === pm
                      ? 'bg-[#171717] text-white shadow-xs'
                      : 'bg-[#F6F5F3] text-[#6B6B6B]'
                  }`}
                >
                  {pm}
                </button>
              ))}
            </div>
          </div>

          {/* Paid & Balance */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
                Amount Paid Now (₹)
              </label>
              <input
                type="number"
                value={paidAmountStr}
                onChange={(e) => setPaidAmountStr(e.target.value)}
                className="w-full bg-[#F6F5F3] rounded-[10px] px-3 py-2 text-[15px] text-[#171717] border border-black/[0.04] focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
                Balance Due
              </label>
              <div className="w-full bg-[#EBEAE6] rounded-[10px] px-3 py-2 text-[15px] font-bold text-[#6B6B6B]">
                {formatINR(Math.max(0, total - (parseFloat(paidAmountStr) || 0)))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirmBill}
            disabled={isSubmitting || items.length === 0}
            className="w-full py-3.5 bg-[#171717] hover:bg-[#2C2C2E] active:scale-95 disabled:opacity-50 text-white rounded-[14px] text-[14px] font-bold shadow-sm transition-all"
          >
            Collect Payment • {formatINR(parseFloat(paidAmountStr) || total)}
          </button>
        </div>
      )}
    </BottomSheet>
  );
};
