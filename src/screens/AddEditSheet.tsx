import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BottomSheet } from '../components/BottomSheet';
import { SegmentedControl } from '../components/SegmentedControl';
import { Entry, EntryType, PaymentMethod, Language, StockItem, Bill, BillItem } from '../types';
import { t, formatINR } from '../i18n';
import { db, adjustStockQuantity, createBillForEntry, getBillForEntry, addCustomer } from '../db/db';
import { getLocalDateString } from '../utils/date';
import { buildBillText, computeBillTotals } from '../utils/billing';
import { StockPickerSheet } from '../components/StockPickerSheet';
import { SparesAutoSuggest } from '../components/wholesale/SparesAutoSuggest';
import { Package, X, Check, Trash2, Receipt, Share2, Download, Plus, ArrowLeftRight, Wrench } from 'lucide-react';
import { downloadBillPDF, shareBillPDF } from '../utils/pdf';
import { syncDayBookCreditEntry, removeDayBookCreditSync, formatCurrencyINR } from '../utils/wholesaleCredit';

export interface SaleItem {
  id: string;
  name: string;
  price: number;
  stockId?: number;
  category?: 'product' | 'service';
}

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
  const [showBillConfig, setShowBillConfig] = useState(false);
  const [billType, setBillType] = useState<'nongst' | 'gst'>('nongst');
  const [gstRate, setGstRate] = useState<number>(18);
  const [shopGstin, setShopGstin] = useState<string>('');
  const [customerGstin, setCustomerGstin] = useState<string>('');
  const [isTaxInclusive, setIsTaxInclusive] = useState<boolean>(true);

  // Stock selection & multi-item sale state
  const [isStockPickerOpen, setIsStockPickerOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [itemPriceStr, setItemPriceStr] = useState('');
  const [deductStock, setDeductStock] = useState(true);
  const [showStockSuggestions, setShowStockSuggestions] = useState(false);
  const itemInputRef = useRef<HTMLInputElement>(null);
  const suggestionsContainerRef = useRef<HTMLDivElement>(null);

  // Exchange / Trade-in state
  const [isExchange, setIsExchange] = useState(false);
  const [exchangeItemPriceStr, setExchangeItemPriceStr] = useState('');
  const [exchangeTradeInModel, setExchangeTradeInModel] = useState('');
  const [exchangeTradeInValueStr, setExchangeTradeInValueStr] = useState('');

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

  // Filtered product/service auto-suggestions
  const stockSuggestions = useMemo(() => {
    const q = item.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    return stockItems
      .filter(
        (si) =>
          si.name.toLowerCase().includes(q) ||
          (si.category && si.category.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [item, stockItems]);

  // Click outside to dismiss auto-suggestions dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        suggestionsContainerRef.current &&
        !suggestionsContainerRef.current.contains(e.target as Node)
      ) {
        setShowStockSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Wholesale clients state & query
  const [selectedClientCloudId, setSelectedClientCloudId] = useState<string | undefined>(undefined);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const [customerSavedNotice, setCustomerSavedNotice] = useState(false);

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

  // Registered customers state & query
  const registeredCustomers = useLiveQuery(
    async () => {
      try {
        if (!db.customers) return [];
        const all = await db.customers.toArray();
        return all.filter((c) => c.syncStatus !== 'deleted' && !c.deletedAt);
      } catch {
        return [];
      }
    },
    []
  ) ?? [];

  const handleQuickSaveCustomer = async () => {
    const trimmed = customerName.trim();
    if (!trimmed) return;
    try {
      await addCustomer({ name: trimmed });
      setCustomerSavedNotice(true);
      setTimeout(() => setCustomerSavedNotice(false), 2000);
      setShowClientDropdown(false);
    } catch (err) {
      console.error('Failed to quick-save customer:', err);
    }
  };

  // Outside click to dismiss customer dropdown
  useEffect(() => {
    const handleCustomerOutsideClick = (e: MouseEvent) => {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(e.target as Node)
      ) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleCustomerOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleCustomerOutsideClick);
    };
  }, []);

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
        setSaleItems([]);
        setItemPriceStr('');
        setDeductStock(false);

        // Exchange state initialization
        if (entryToEdit.isExchange) {
          setIsExchange(true);
          setExchangeItemPriceStr(entryToEdit.exchangeItemPrice ? entryToEdit.exchangeItemPrice.toString() : '');
          setExchangeTradeInModel(entryToEdit.exchangeTradeInModel || '');
          setExchangeTradeInValueStr(entryToEdit.exchangeTradeInValue ? entryToEdit.exchangeTradeInValue.toString() : '');
        } else {
          setIsExchange(false);
          setExchangeItemPriceStr('');
          setExchangeTradeInModel('');
          setExchangeTradeInValueStr('');
        }

        // Check if a bill already exists for this entry
        if (entryToEdit.id && entryToEdit.type === 'in') {
          getBillForEntry(entryToEdit.id)
            .then((b) => {
              setActiveBill(b || null);
              if (b?.isGst) {
                setBillType('gst');
                if (b.gstRate) setGstRate(b.gstRate);
                if (b.shopGstin) setShopGstin(b.shopGstin);
                if (b.customerGstin) setCustomerGstin(b.customerGstin);
                if (b.isTaxInclusive !== undefined) setIsTaxInclusive(b.isTaxInclusive);
              } else {
                setBillType('nongst');
              }
            })
            .catch(() => setActiveBill(null));
        } else {
          setActiveBill(null);
          setBillType('nongst');
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
        setSaleItems([]);
        setItemPriceStr('');
        setDeductStock(true);
        setActiveBill(null);
        setBillType('nongst');
        setGstRate(18);
        setCustomerGstin('');
        setIsTaxInclusive(true);
        setIsExchange(false);
        setExchangeItemPriceStr('');
        setExchangeTradeInModel('');
        setExchangeTradeInValueStr('');
      }
      setShowClientDropdown(false);
      setShowBillPreview(false);
      setShowBillConfig(false);
      setIsGeneratingBill(false);
      setError(null);
      isSubmittingRef.current = false;
      setIsSubmitting(false);

      if (settings?.shopGstin && !shopGstin) {
        setShopGstin(settings.shopGstin);
      }

      // Auto-focus amount field
      const timer = setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, entryToEdit, defaultDate]);

  useEffect(() => {
    if (settings?.shopGstin && !shopGstin) {
      setShopGstin(settings.shopGstin);
    }
  }, [settings?.shopGstin]);

  const configSubtotal = useMemo(() => {
    if (saleItems.length > 0) {
      return saleItems.reduce((sum, it) => sum + it.price, 0);
    }
    const sanitized = amountStr.replace(/,/g, '').trim();
    return parseFloat(sanitized) || 0;
  }, [saleItems, amountStr]);

  const configTotals = useMemo(() => {
    const dummyItems = [{ name: 'item', qty: 1, price: configSubtotal }];
    return computeBillTotals(dummyItems, 0, billType === 'gst', gstRate, isTaxInclusive);
  }, [configSubtotal, billType, gstRate, isTaxInclusive]);

  const handleGenerateBillClick = () => {
    if (activeBill) {
      setShowBillPreview(true);
      return;
    }

    const sanitizedAmountStr = amountStr.replace(/,/g, '').trim();
    const parsedAmount = parseFloat(sanitizedAmountStr);
    if ((isNaN(parsedAmount) || parsedAmount <= 0) && saleItems.length === 0) {
      setError('Enter an amount or add items to generate a bill');
      amountInputRef.current?.focus();
      return;
    }

    setError(null);
    setShowBillConfig(true);
  };

  const handleGenerateBillConfirm = async () => {
    if (isSubmittingRef.current || isGeneratingBill) return;
    isSubmittingRef.current = true;
    setIsGeneratingBill(true);

    const sanitizedAmountStr = amountStr.replace(/,/g, '').trim();
    let parsedAmount = parseFloat(sanitizedAmountStr);
    if (saleItems.length > 0) {
      parsedAmount = saleItems.reduce((sum, it) => sum + it.price, 0);
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount');
      isSubmittingRef.current = false;
      setIsGeneratingBill(false);
      return;
    }

    const creditError = validateCreditEntry(type, paymentMethod, customerName);
    if (creditError) {
      setError(creditError);
      isSubmittingRef.current = false;
      setIsGeneratingBill(false);
      return;
    }

    if (billType === 'gst' && shopGstin.trim() && shopGstin.trim().length < 15) {
      setError('Please enter a valid 15-character GSTIN');
      isSubmittingRef.current = false;
      setIsGeneratingBill(false);
      return;
    }

    try {
      const itemsForBill: BillItem[] =
        saleItems.length > 0
          ? saleItems.map((si) => ({
              name: si.name,
              qty: 1,
              price: si.price,
              stockId: si.stockId,
            }))
          : [
              {
                name: item.trim() || 'General Sale',
                qty: 1,
                price: parsedAmount,
                stockId: selectedStockItem?.id,
              },
            ];

      const isGst = billType === 'gst';
      let targetEntry = entryToEdit;

      // If entry not saved yet, save it first to Day Book
      if (!targetEntry || !targetEntry.id) {
        const finalItem =
          saleItems.length > 0
            ? saleItems.map((i) => i.name).join(', ')
            : (item.trim() || undefined);

        const parsedExchangeItemPrice = parseFloat(exchangeItemPriceStr.replace(/,/g, ''));
        const parsedExchangeTradeInValue = parseFloat(exchangeTradeInValueStr.replace(/,/g, ''));

        let finalNote = note.trim();
        if (type === 'in' && isExchange && !finalNote) {
          const parts: string[] = [];
          if (exchangeTradeInModel.trim()) parts.push(exchangeTradeInModel.trim());
          if (!isNaN(parsedExchangeTradeInValue) && parsedExchangeTradeInValue > 0) {
            parts.push(`₹${parsedExchangeTradeInValue.toLocaleString('en-IN')} trade-in`);
          }
          if (!isNaN(parsedExchangeItemPrice) && parsedExchangeItemPrice > 0) {
            parts.push(`off ₹${parsedExchangeItemPrice.toLocaleString('en-IN')}`);
          }
          if (parts.length > 0) {
            finalNote = `Exchange: ${parts.join(' ')}`;
          }
        }

        const savedId = (await db.entries.add({
          type,
          amount: parsedAmount,
          item: finalItem,
          customerName: customerName.trim() || undefined,
          note: finalNote || undefined,
          paymentMethod: type === 'in' ? paymentMethod : undefined,
          date,
          createdAt: Date.now(),
          isExchange: type === 'in' ? isExchange : false,
          exchangeItemPrice: type === 'in' && isExchange && !isNaN(parsedExchangeItemPrice) ? parsedExchangeItemPrice : undefined,
          exchangeTradeInModel: type === 'in' && isExchange && exchangeTradeInModel.trim() ? exchangeTradeInModel.trim() : undefined,
          exchangeTradeInValue: type === 'in' && isExchange && !isNaN(parsedExchangeTradeInValue) ? parsedExchangeTradeInValue : undefined,
        })) as number;

        if (type === 'in' && deductStock) {
          if (saleItems.length > 0) {
            for (const sItem of saleItems) {
              if (sItem.stockId && sItem.category === 'product') {
                await adjustStockQuantity(sItem.stockId, -1);
              }
            }
          } else if (
            selectedStockItem &&
            selectedStockItem.category === 'product' &&
            selectedStockItem.id
          ) {
            await adjustStockQuantity(selectedStockItem.id, -1);
          }
        }

        targetEntry = {
          id: savedId,
          type,
          amount: parsedAmount,
          item: finalItem,
          customerName: customerName.trim() || undefined,
          note: finalNote || undefined,
          paymentMethod: type === 'in' ? paymentMethod : undefined,
          date,
          createdAt: Date.now(),
        };

        if (
          settings?.wholesaleMode ||
          selectedClientCloudId ||
          paymentMethod === 'credit'
        ) {
          await syncDayBookCreditEntry(selectedClientCloudId, targetEntry, undefined);
        }
      }

      const bill = await createBillForEntry(targetEntry, {
        items: itemsForBill,
        isGst,
        gstRate,
        shopGstin: shopGstin.trim() || undefined,
        customerGstin: customerGstin.trim() || undefined,
        isTaxInclusive,
        customerName: customerName.trim() || undefined,
        paymentMethod,
      });

      setActiveBill(bill);
      setShowBillConfig(false);
      setShowBillPreview(true);
      onSaved(date);
    } catch (err) {
      console.error('Failed to generate bill:', err);
      setError('Error generating bill');
    } finally {
      isSubmittingRef.current = false;
      setIsGeneratingBill(false);
    }
  };

  const handleShareBill = async () => {
    if (!activeBill) return;
    await shareBillPDF({
      bill: activeBill,
      shopName: effectiveShopName,
      shopAddress: effectiveShopAddress,
      shopPhone: settings?.shopPhone,
      shopLogo: settings?.shopLogo,
    });
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
    if (type === 'in') {
      const newItem: SaleItem = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: stockItem.name,
        price: stockItem.sellingPrice || 0,
        stockId: stockItem.id,
        category: stockItem.category,
      };
      const updated = [...saleItems, newItem];
      setSaleItems(updated);
      setSelectedStockItem(stockItem);
      const total = updated.reduce((sum, it) => sum + it.price, 0);
      setAmountStr(total > 0 ? total.toString() : '');
      if (stockItem.notes && !note) {
        setNote(stockItem.notes);
      }
      setItem('');
      setItemPriceStr('');
      setShowStockSuggestions(false);
      setTimeout(() => itemInputRef.current?.focus(), 50);
    } else {
      setSelectedStockItem(stockItem);
      setItem(stockItem.name);
      setAmountStr(stockItem.sellingPrice.toString());
      if (stockItem.notes && !note) {
        setNote(stockItem.notes);
      }
      setShowStockSuggestions(false);
    }
    if (error) setError(null);
  };

  const handleAddCustomItem = () => {
    const trimmedName = item.trim();
    if (!trimmedName) return;

    let parsedPrice = parseFloat(itemPriceStr.replace(/,/g, ''));
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      if (saleItems.length === 0 && amountStr.trim()) {
        const topAmount = parseFloat(amountStr.replace(/,/g, ''));
        parsedPrice = !isNaN(topAmount) && topAmount > 0 ? topAmount : 0;
      } else {
        parsedPrice = 0;
      }
    }

    const newItem: SaleItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      price: parsedPrice,
    };

    const updated = [...saleItems, newItem];
    setSaleItems(updated);
    const total = updated.reduce((sum, it) => sum + it.price, 0);
    setAmountStr(total > 0 ? total.toString() : amountStr);
    setItem('');
    setItemPriceStr('');
    setShowStockSuggestions(false);
    setTimeout(() => itemInputRef.current?.focus(), 50);
    if (error) setError(null);
  };

  const handleRemoveSaleItem = (id: string) => {
    const updated = saleItems.filter((i) => i.id !== id);
    setSaleItems(updated);
    if (updated.length > 0) {
      const total = updated.reduce((sum, it) => sum + it.price, 0);
      setAmountStr(total.toString());
    } else {
      setSelectedStockItem(null);
    }
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

    const finalItem =
      saleItems.length > 0
        ? saleItems.map((i) => i.name).join(', ')
        : (item.trim() || undefined);

    const parsedExchangeItemPrice = parseFloat(exchangeItemPriceStr.replace(/,/g, ''));
    const parsedExchangeTradeInValue = parseFloat(exchangeTradeInValueStr.replace(/,/g, ''));

    let finalNote = note.trim();
    if (type === 'in' && isExchange && !finalNote) {
      const parts: string[] = [];
      if (exchangeTradeInModel.trim()) parts.push(exchangeTradeInModel.trim());
      if (!isNaN(parsedExchangeTradeInValue) && parsedExchangeTradeInValue > 0) {
        parts.push(`₹${parsedExchangeTradeInValue.toLocaleString('en-IN')} trade-in`);
      }
      if (!isNaN(parsedExchangeItemPrice) && parsedExchangeItemPrice > 0) {
        parts.push(`off ₹${parsedExchangeItemPrice.toLocaleString('en-IN')}`);
      }
      if (parts.length > 0) {
        finalNote = `Exchange: ${parts.join(' ')}`;
      }
    }

    try {
      let savedId = entryToEdit?.id;
      if (entryToEdit && entryToEdit.id) {
        await db.entries.update(entryToEdit.id, {
          type,
          amount: parsedAmount,
          item: finalItem,
          customerName: customerName.trim() || undefined,
          note: finalNote || undefined,
          paymentMethod: type === 'in' ? paymentMethod : undefined,
          date,
          isExchange: type === 'in' ? isExchange : false,
          exchangeItemPrice: type === 'in' && isExchange && !isNaN(parsedExchangeItemPrice) ? parsedExchangeItemPrice : undefined,
          exchangeTradeInModel: type === 'in' && isExchange && exchangeTradeInModel.trim() ? exchangeTradeInModel.trim() : undefined,
          exchangeTradeInValue: type === 'in' && isExchange && !isNaN(parsedExchangeTradeInValue) ? parsedExchangeTradeInValue : undefined,
        });
      } else {
        savedId = (await db.entries.add({
          type,
          amount: parsedAmount,
          item: finalItem,
          customerName: customerName.trim() || undefined,
          note: finalNote || undefined,
          paymentMethod: type === 'in' ? paymentMethod : undefined,
          date,
          createdAt: Date.now(),
          isExchange: type === 'in' ? isExchange : false,
          exchangeItemPrice: type === 'in' && isExchange && !isNaN(parsedExchangeItemPrice) ? parsedExchangeItemPrice : undefined,
          exchangeTradeInModel: type === 'in' && isExchange && exchangeTradeInModel.trim() ? exchangeTradeInModel.trim() : undefined,
          exchangeTradeInValue: type === 'in' && isExchange && !isNaN(parsedExchangeTradeInValue) ? parsedExchangeTradeInValue : undefined,
        })) as number;

        // Deduct inventory quantity if product and option checked
        if (type === 'in' && deductStock) {
          if (saleItems.length > 0) {
            for (const sItem of saleItems) {
              if (sItem.stockId && sItem.category === 'product') {
                await adjustStockQuantity(sItem.stockId, -1);
              }
            }
          } else if (
            selectedStockItem &&
            selectedStockItem.category === 'product' &&
            selectedStockItem.id
          ) {
            await adjustStockQuantity(selectedStockItem.id, -1);
          }
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
        setShowBillConfig(false);
        setShowBillPreview(false);
        onClose();
      }}
      title={
        showBillPreview && activeBill
          ? activeBill.isGst
            ? `Tax Invoice ${activeBill.invoiceNo}`
            : `Bill ${activeBill.invoiceNo}`
          : showBillConfig
          ? 'Generate Bill'
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
                setShowBillConfig(false);
                setShowBillPreview(false);
                onClose();
              }}
              className="px-4 h-12 rounded-[12px] font-semibold text-[15px] bg-[#E5E5EA] text-black active:opacity-85 transition-all"
            >
              Done
            </button>
          </div>
        ) : showBillConfig ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowBillConfig(false)}
              className="px-4 h-12 rounded-[12px] font-semibold text-[15px] bg-[#E5E5EA] text-black active:opacity-85 transition-all"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleGenerateBillConfirm}
              disabled={isSubmitting || isGeneratingBill}
              className={`flex-1 h-12 rounded-[12px] font-semibold text-[15px] text-white bg-emerald-600 hover:bg-emerald-700 active:opacity-85 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 ${
                isSubmitting || isGeneratingBill ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>
                {isGeneratingBill
                  ? 'Generating Bill...'
                  : `Confirm & Generate Bill · ${formatINR(configTotals.total)}`}
              </span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Generate Bill / View Bill Button for In Entries (Both New Entry & Edit) */}
            {type === 'in' && (
              <button
                type="button"
                onClick={handleGenerateBillClick}
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
            <div className="flex items-center space-x-1.5">
              <span>{activeBill.isGst ? 'GST Tax Invoice' : 'Non-GST Bill'} generated.</span>
            </div>
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
      ) : showBillConfig ? (
        <div className="space-y-4 pt-1 pb-2 animate-fade-in">
          {/* Invoice Type Switcher */}
          <div>
            <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1.5">
              Invoice Type
            </span>
            <SegmentedControl<'nongst' | 'gst'>
              value={billType}
              onChange={(v) => setBillType(v)}
              options={[
                { value: 'nongst', label: 'Non-GST (Regular)' },
                { value: 'gst', label: 'GST (Tax Invoice)' },
              ]}
            />
          </div>

          {billType === 'nongst' ? (
            <div className="bg-gray-50 rounded-[12px] p-3.5 border border-gray-200/80 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#8E8E93]">Billing Amount</span>
                <span className="text-base font-bold text-black tabular-nums">
                  {formatINR(configTotals.total)}
                </span>
              </div>
              <p className="text-xs text-[#8E8E93]">
                Creates a standard retail invoice / cash memo with invoice number without tax breakdown.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* GST Rate Selection */}
              <div>
                <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1.5">
                  GST Rate
                </span>
                <SegmentedControl<string>
                  value={String(gstRate)}
                  onChange={(v) => setGstRate(Number(v))}
                  size="sm"
                  options={[
                    { value: '5', label: '5%' },
                    { value: '12', label: '12%' },
                    { value: '18', label: '18%' },
                    { value: '28', label: '28%' },
                  ]}
                />
              </div>

              {/* Tax Mode: Inclusive vs Exclusive */}
              <label className="flex items-center space-x-2.5 cursor-pointer bg-gray-50 p-2.5 rounded-[10px] border border-gray-200/70">
                <input
                  type="checkbox"
                  checked={isTaxInclusive}
                  onChange={(e) => setIsTaxInclusive(e.target.checked)}
                  className="rounded text-iosBlue focus:ring-iosBlue/40 w-4 h-4"
                />
                <span className="text-xs font-medium text-black">
                  Amount already includes GST (Retail MRP)
                </span>
              </label>

              {/* Shop GSTIN */}
              <div>
                <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1">
                  Shop GSTIN
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={shopGstin}
                  onChange={(e) => setShopGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 27AAPFU0939L1ZV"
                  className="w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-[14px] text-black font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
                />
              </div>

              {/* Customer GSTIN (optional) */}
              <div>
                <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1">
                  Customer GSTIN (Optional)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={customerGstin}
                  onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                  placeholder="Customer GSTIN for B2B billing"
                  className="w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-[14px] text-black font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
                />
              </div>

              {/* Live Tax Calculation Card */}
              <div className="bg-blue-50/70 border border-blue-200/70 rounded-[12px] p-3 text-xs space-y-1.5 text-blue-950">
                <div className="flex justify-between">
                  <span className="text-blue-800">Taxable Value:</span>
                  <span className="font-semibold tabular-nums">{formatINR(configTotals.taxableAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-800">CGST ({gstRate / 2}%):</span>
                  <span className="font-semibold tabular-nums">{formatINR(configTotals.cgstAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-800">SGST ({gstRate / 2}%):</span>
                  <span className="font-semibold tabular-nums">{formatINR(configTotals.sgstAmount)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-blue-200 font-bold text-sm text-black">
                  <span>Total Invoice Amount:</span>
                  <span className="tabular-nums text-iosBlue">{formatINR(configTotals.total)}</span>
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-iosRed font-medium">{error}</p>}
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

        {/* Exchange / Trade-in Toggle & Form (Only for IN) */}
        {type === 'in' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const nextVal = !isExchange;
                  setIsExchange(nextVal);
                  if (nextVal) {
                    // Pre-fill item price with current amount if empty
                    if (!exchangeItemPriceStr && amountStr) {
                      setExchangeItemPriceStr(amountStr);
                    }
                  }
                }}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-[8px] transition-all flex items-center space-x-1.5 border active:scale-95 ${
                  isExchange
                    ? 'bg-teal-50 text-teal-800 border-teal-300 shadow-2xs'
                    : 'bg-[#F2F2F7] text-gray-600 border-black/[0.06] hover:bg-gray-200/70'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-teal-600" />
                <span>{isExchange ? 'Exchange / Trade-in Active' : '⇄ Exchange / Trade-in'}</span>
              </button>
              {isExchange && (
                <button
                  type="button"
                  onClick={() => {
                    setIsExchange(false);
                    setExchangeItemPriceStr('');
                    setExchangeTradeInModel('');
                    setExchangeTradeInValueStr('');
                  }}
                  className="text-[11px] text-gray-400 hover:text-iosRed font-medium"
                >
                  Cancel Exchange
                </button>
              )}
            </div>

            {isExchange && (
              <div className="bg-teal-50/60 border border-teal-200/80 rounded-[12px] p-3 space-y-2.5 animate-fade-in">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-teal-900 ml-0.5">
                      Selling Item Price (₹)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={exchangeItemPriceStr}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^[0-9,.]*$/.test(val)) {
                          setExchangeItemPriceStr(val);
                          const pItem = parseFloat(val.replace(/,/g, '')) || 0;
                          const pTrade = parseFloat(exchangeTradeInValueStr.replace(/,/g, '')) || 0;
                          const diff = Math.max(0, pItem - pTrade);
                          setAmountStr(diff > 0 ? diff.toString() : '');
                        }
                      }}
                      placeholder="e.g. 18000"
                      className="w-full bg-white rounded-[8px] px-2.5 py-1.5 text-xs text-black font-semibold border border-teal-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-teal-900 ml-0.5">
                      Old Phone Value (₹)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={exchangeTradeInValueStr}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^[0-9,.]*$/.test(val)) {
                          setExchangeTradeInValueStr(val);
                          const pItem = parseFloat(exchangeItemPriceStr.replace(/,/g, '')) || 0;
                          const pTrade = parseFloat(val.replace(/,/g, '')) || 0;
                          const diff = Math.max(0, pItem - pTrade);
                          setAmountStr(diff > 0 ? diff.toString() : '');
                        }
                      }}
                      placeholder="e.g. 4000"
                      className="w-full bg-white rounded-[8px] px-2.5 py-1.5 text-xs text-black font-semibold border border-teal-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-teal-900 ml-0.5">
                    Old Phone / Device Received
                  </label>
                  <input
                    type="text"
                    value={exchangeTradeInModel}
                    onChange={(e) => setExchangeTradeInModel(e.target.value)}
                    placeholder="e.g. Redmi Note 9 Pro / Vivo Y20"
                    className="w-full bg-white rounded-[8px] px-2.5 py-1.5 text-xs text-black border border-teal-200 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder:text-gray-400"
                  />
                </div>

                {/* Live math helper summary */}
                <div className="text-[11px] text-teal-800 font-medium bg-teal-100/60 rounded-[6px] px-2 py-1 flex items-center justify-between">
                  <span>Customer pays (Cash in Drawer):</span>
                  <span className="font-bold text-teal-950">₹{amountStr || '0'}</span>
                </div>
              </div>
            )}
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
                const isSelected =
                  selectedStockItem?.id === si.id ||
                  saleItems.some((it) => it.stockId === si.id);
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
          ) : type === 'in' ? (
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <input
                    ref={itemInputRef}
                    type="text"
                    value={item}
                    onChange={(e) => {
                      setItem(e.target.value);
                      setShowStockSuggestions(true);
                      if (selectedStockItem && selectedStockItem.name !== e.target.value) {
                        setSelectedStockItem(null);
                      }
                    }}
                    onFocus={() => {
                      if (item.trim().length >= 1) setShowStockSuggestions(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowStockSuggestions(false);
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (
                          showStockSuggestions &&
                          stockSuggestions.length > 0 &&
                          stockSuggestions[0].name.toLowerCase() === item.trim().toLowerCase()
                        ) {
                          handleSelectStockItem(stockSuggestions[0]);
                        } else if (item.trim()) {
                          handleAddCustomItem();
                        }
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
                        setShowStockSuggestions(false);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Stock search auto-suggestions dropdown */}
                  {showStockSuggestions && stockSuggestions.length > 0 && (
                    <div
                      ref={suggestionsContainerRef}
                      className="absolute left-0 right-0 top-full mt-1 bg-white rounded-[12px] shadow-xl border border-black/10 z-30 max-h-56 overflow-y-auto divide-y divide-black/[0.04] animate-fade-in"
                    >
                      <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>Matching Products &amp; Services</span>
                        <span>Tap to add</span>
                      </div>
                      {stockSuggestions.map((si) => (
                        <button
                          key={si.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectStockItem(si);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-slate-50 active:bg-slate-100 flex items-center justify-between transition-colors text-xs"
                        >
                          <div className="flex items-center space-x-2 min-w-0 pr-2">
                            <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                              {si.category === 'service' ? (
                                <Wrench className="w-3.5 h-3.5 text-amber-600" />
                              ) : (
                                <Package className="w-3.5 h-3.5 text-iosBlue" />
                              )}
                            </div>
                            <div className="truncate">
                              <p className="font-semibold text-black truncate">{si.name}</p>
                              <p className="text-[10px] text-gray-500">
                                {si.category === 'service'
                                  ? 'Service'
                                  : typeof si.quantity === 'number'
                                  ? `${si.quantity} in stock`
                                  : 'Product'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-black text-sm">₹{si.sellingPrice}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Optional price field and Add button for adding to multi-item sale */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-20 relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 select-none font-semibold">
                      ₹
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={itemPriceStr}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^[0-9,.]*$/.test(val)) setItemPriceStr(val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (item.trim()) handleAddCustomItem();
                        }
                      }}
                      placeholder="Price"
                      disabled={isReadOnly}
                      className="w-full bg-[#F2F2F7] rounded-[10px] pl-5 pr-2 py-2.5 text-[14px] text-black font-semibold text-right focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04] placeholder:text-gray-400 placeholder:font-normal"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    disabled={isReadOnly || !item.trim()}
                    className="h-10 px-3 rounded-[10px] bg-slate-900 text-white text-xs font-semibold hover:bg-black active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center space-x-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Multi-Item Sale List */}
              {saleItems.length > 0 && (
                <div className="bg-[#F2F2F7]/70 border border-black/[0.06] rounded-[12px] p-2.5 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider px-1">
                    <span>Products &amp; Services ({saleItems.length})</span>
                    <span className="text-black font-extrabold">
                      Total: ₹{saleItems.reduce((acc, i) => acc + i.price, 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="divide-y divide-black/[0.05] bg-white rounded-[10px] overflow-hidden border border-black/[0.04]">
                    {saleItems.map((si, idx) => (
                      <div key={si.id} className="px-3 py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2 min-w-0 pr-2">
                          <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-black truncate">{si.name}</span>
                          {si.stockId && (
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/80 shrink-0">
                              Stock
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="font-bold text-black">₹{si.price.toLocaleString('en-IN')}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSaleItem(si.id)}
                            className="p-1 text-gray-400 hover:text-iosRed rounded-full active:scale-90 transition-colors"
                            title="Remove item"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <input
                ref={itemInputRef}
                type="text"
                value={item}
                onChange={(e) => {
                  setItem(e.target.value);
                  setShowStockSuggestions(true);
                  if (selectedStockItem && selectedStockItem.name !== e.target.value) {
                    setSelectedStockItem(null);
                  }
                }}
                onFocus={() => {
                  if (item.trim().length >= 1) setShowStockSuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowStockSuggestions(false);
                  } else if (e.key === 'Enter') {
                    if (
                      showStockSuggestions &&
                      stockSuggestions.length > 0 &&
                      stockSuggestions[0].name.toLowerCase() === item.trim().toLowerCase()
                    ) {
                      e.preventDefault();
                      handleSelectStockItem(stockSuggestions[0]);
                    }
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
                    setShowStockSuggestions(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Stock search auto-suggestions dropdown for type === 'out' */}
              {showStockSuggestions && stockSuggestions.length > 0 && (
                <div
                  ref={suggestionsContainerRef}
                  className="absolute left-0 right-0 top-full mt-1 bg-white rounded-[12px] shadow-xl border border-black/10 z-30 max-h-56 overflow-y-auto divide-y divide-black/[0.04] animate-fade-in"
                >
                  <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Matching Products &amp; Services</span>
                    <span>Tap to select</span>
                  </div>
                  {stockSuggestions.map((si) => (
                    <button
                      key={si.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectStockItem(si);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 active:bg-slate-100 flex items-center justify-between transition-colors text-xs"
                    >
                      <div className="flex items-center space-x-2 min-w-0 pr-2">
                        <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                          {si.category === 'service' ? (
                            <Wrench className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <Package className="w-3.5 h-3.5 text-iosBlue" />
                          )}
                        </div>
                        <div className="truncate">
                          <p className="font-semibold text-black truncate">{si.name}</p>
                          <p className="text-[10px] text-gray-500">
                            {si.category === 'service'
                              ? 'Service'
                              : typeof si.quantity === 'number'
                              ? `${si.quantity} in stock`
                              : 'Product'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-black text-sm">₹{si.sellingPrice}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected Stock Item details & Stock deduction toggle */}
          {type === 'in' && (
            saleItems.some((si) => si.stockId && si.category === 'product') ||
            (selectedStockItem && selectedStockItem.category === 'product' && typeof selectedStockItem.quantity === 'number')
          ) && (
            <div className="bg-blue-50/80 border border-blue-200 rounded-[10px] p-2.5 flex items-center justify-between text-xs animate-fade-in">
              <div className="flex items-center space-x-2 text-blue-900 min-w-0 pr-1">
                <Check className="w-4 h-4 text-iosBlue shrink-0" />
                <span className="font-semibold truncate">
                  Auto-deduct inventory quantities for stock items
                </span>
              </div>
              <label className="flex items-center space-x-1.5 text-[11px] text-gray-700 cursor-pointer font-medium shrink-0">
                <input
                  type="checkbox"
                  checked={deductStock}
                  onChange={(e) => setDeductStock(e.target.checked)}
                  className="rounded text-iosBlue focus:ring-iosBlue"
                />
                <span>Deduct</span>
              </label>
            </div>
          )}
          {type !== 'in' && selectedStockItem && (
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
              </div>
            </div>
          )}
        </div>

        {/* 5. Customer Name (Required if Credit, Optional otherwise) */}
        <div ref={customerDropdownRef} className="space-y-1 relative">
          <label className="text-xs font-medium text-[#8E8E93] ml-1 flex items-center justify-between">
            <span>
              {settings?.wholesaleMode ? 'Customer / Client Shop Name' : t('customer_label', language)}
              {type === 'in' && paymentMethod === 'credit' && (
                <span className="text-amber-600 font-bold ml-1">* (Required for Credit)</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {customerSavedNotice && (
                <span className="text-[11px] text-iosGreen font-semibold animate-fade-in flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved!
                </span>
              )}
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
            </div>
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
                ? 'Enter customer or client shop name...'
                : t('customer_placeholder', language)
            }
            disabled={isReadOnly}
            className="w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-[15px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
          />

          {/* Autocomplete dropdown for registered customers & wholesale clients */}
          {showClientDropdown && (
            (() => {
              const query = customerName.toLowerCase().trim();
              const matchingCustomers = query
                ? registeredCustomers.filter(
                    (c) =>
                      c.name.toLowerCase().includes(query) ||
                      (c.phone && c.phone.includes(query))
                  )
                : registeredCustomers.slice(0, 5);

              const matchingClients = settings?.wholesaleMode && query
                ? registeredClients.filter(
                    (c) =>
                      c.shopName.toLowerCase().includes(query) ||
                      (c.contactPerson && c.contactPerson.toLowerCase().includes(query)) ||
                      c.phone.includes(query)
                  )
                : [];

              const hasExactCustomerMatch = registeredCustomers.some(
                (c) => c.name.toLowerCase().trim() === query
              );

              if (matchingCustomers.length === 0 && matchingClients.length === 0 && (!query || hasExactCustomerMatch)) {
                return null;
              }

              return (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-[14px] shadow-xl border border-black/[0.08] max-h-56 overflow-y-auto z-50 p-1.5 space-y-1">
                  {/* Matching Regular Customers */}
                  {matchingCustomers.length > 0 && (
                    <div>
                      <div className="px-2.5 py-1 text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">
                        Saved Customers
                      </div>
                      {matchingCustomers.slice(0, 6).map((c) => (
                        <button
                          key={c.id || c.cloudId}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setCustomerName(c.name);
                            setShowClientDropdown(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-[8px] hover:bg-[#F2F2F7] active:bg-[#E5E5EA] flex items-center justify-between text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <div className="w-6 h-6 rounded-full bg-blue-50 text-iosBlue font-bold flex items-center justify-center shrink-0 text-[11px]">
                              {c.name.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="truncate">
                              <span className="font-semibold text-black block truncate">{c.name}</span>
                              {c.phone && (
                                <span className="text-[11px] text-gray-500 block truncate">{c.phone}</span>
                              )}
                            </div>
                          </div>
                          {c.address && (
                            <span className="text-[10px] text-gray-400 shrink-0 truncate max-w-[110px]">
                              {c.address}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Matching Wholesale Clients (if in wholesale mode) */}
                  {matchingClients.length > 0 && (
                    <div className="border-t border-black/[0.05] pt-1 mt-1">
                      <div className="px-2.5 py-1 text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">
                        Wholesale Clients
                      </div>
                      {matchingClients.slice(0, 5).map((c) => (
                        <button
                          key={c.cloudId}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setCustomerName(c.shopName);
                            setSelectedClientCloudId(c.cloudId);
                            setShowClientDropdown(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-[8px] hover:bg-[#F2F2F7] active:bg-[#E5E5EA] flex items-center justify-between text-xs transition-colors"
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

                  {/* Quick-save as new customer option */}
                  {query.length >= 2 && !hasExactCustomerMatch && (
                    <div className="border-t border-black/[0.05] pt-1">
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleQuickSaveCustomer();
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-[8px] hover:bg-blue-50 text-iosBlue flex items-center gap-2 text-xs font-semibold transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Save &quot;{customerName.trim()}&quot; as new customer</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()
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
