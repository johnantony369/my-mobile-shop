import React, { useState, useEffect, useRef } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { SegmentedControl } from '../components/SegmentedControl';
import { StockItem, StockCategory, Language } from '../types';
import { db } from '../db/db';
import { Package, Wrench, Plus, Minus, ScanBarcode, Trash2 } from 'lucide-react';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';

interface AddEditStockSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (item: StockItem) => void;
  onDelete?: (item: StockItem) => void;
  itemToEdit: StockItem | null;
  language: Language;
  defaultCategory?: StockCategory;
  initialSku?: string;
}

export const AddEditStockSheet: React.FC<AddEditStockSheetProps> = ({
  isOpen,
  onClose,
  onSaved,
  onDelete,
  itemToEdit,
  language: _language,
  defaultCategory = 'product',
  initialSku = '',
}) => {
  const [category, setCategory] = useState<StockCategory>(itemToEdit?.category || defaultCategory);
  const [name, setName] = useState(itemToEdit?.name || '');
  const [sellingPriceStr, setSellingPriceStr] = useState(itemToEdit?.sellingPrice ? itemToEdit.sellingPrice.toString() : '');
  const [costPriceStr, setCostPriceStr] = useState(itemToEdit?.costPrice !== undefined && itemToEdit.costPrice !== null ? itemToEdit.costPrice.toString() : '');
  const [quantityStr, setQuantityStr] = useState(() => {
    if (!itemToEdit) return '10';
    const q = typeof itemToEdit.quantity === 'number' ? itemToEdit.quantity : 0;
    return q === 0 ? '' : q.toString();
  });
  const [unit, setUnit] = useState(itemToEdit?.unit || (defaultCategory === 'product' ? 'pcs' : 'service'));
  const [lowStockThresholdStr, setLowStockThresholdStr] = useState(
    typeof itemToEdit?.lowStockThreshold === 'number' ? itemToEdit.lowStockThreshold.toString() : '5'
  );
  const [sku, setSku] = useState(itemToEdit?.sku || initialSku);
  const [notes, setNotes] = useState(itemToEdit?.notes || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const isSubmittingRef = useRef(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setCategory(itemToEdit.category);
        setName(itemToEdit.name);
        setSellingPriceStr(itemToEdit.sellingPrice ? itemToEdit.sellingPrice.toString() : '');
        setCostPriceStr(itemToEdit.costPrice !== undefined && itemToEdit.costPrice !== null ? itemToEdit.costPrice.toString() : '');
        const currentQty = typeof itemToEdit.quantity === 'number' ? itemToEdit.quantity : 0;
        setQuantityStr(currentQty === 0 ? '' : currentQty.toString());
        setUnit(itemToEdit.unit || (itemToEdit.category === 'product' ? 'pcs' : 'service'));
        setLowStockThresholdStr(typeof itemToEdit.lowStockThreshold === 'number' ? itemToEdit.lowStockThreshold.toString() : '5');
        setSku(itemToEdit.sku || '');
        setNotes(itemToEdit.notes || '');
      } else {
        setCategory(defaultCategory);
        setName('');
        setSellingPriceStr('');
        setCostPriceStr('');
        setQuantityStr('10');
        setUnit(defaultCategory === 'product' ? 'pcs' : 'service');
        setLowStockThresholdStr('5');
        setSku(initialSku || '');
        setNotes('');
      }
      setError(null);
      isSubmittingRef.current = false;
      setIsSubmitting(false);

      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, itemToEdit, defaultCategory, initialSku]);


  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter item or service name');
      nameInputRef.current?.focus();
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const cleanSell = sellingPriceStr.replace(/,/g, '').trim();
    const parsedSell = parseFloat(cleanSell);
    if (isNaN(parsedSell) || parsedSell < 0 || parsedSell > 9999999) {
      setError('Please enter a valid selling price');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    let parsedCost: number | undefined = undefined;
    if (costPriceStr.trim()) {
      const cleanCost = costPriceStr.replace(/,/g, '').trim();
      const pCost = parseFloat(cleanCost);
      if (isNaN(pCost) || pCost < 0 || pCost > 9999999) {
        setError('Please enter a valid cost price');
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }
      parsedCost = pCost;
    }

    const parsedQty = quantityStr.trim() === '' ? 0 : parseInt(quantityStr, 10);
    const cleanQty = isNaN(parsedQty) || parsedQty < 0 ? 0 : parsedQty;

    const parsedThreshold = lowStockThresholdStr.trim() === '' ? 5 : parseInt(lowStockThresholdStr, 10);
    const cleanThreshold = isNaN(parsedThreshold) || parsedThreshold < 1 ? 5 : parsedThreshold;

    try {
      const itemData: Omit<StockItem, 'id'> = {
        name: trimmedName,
        category,
        sellingPrice: parsedSell,
        costPrice: parsedCost,
        quantity: category === 'product' ? cleanQty : undefined,
        unit: unit.trim() || (category === 'product' ? 'pcs' : 'service'),
        lowStockThreshold: category === 'product' ? cleanThreshold : undefined,
        sku: sku.trim() || undefined,
        notes: notes.trim() || undefined,
        createdAt: itemToEdit?.createdAt || Date.now(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
      };

      if (itemToEdit && itemToEdit.id) {
        await db.stock.update(itemToEdit.id, itemData);
        onSaved({ ...itemData, id: itemToEdit.id });
      } else {
        const id = await db.stock.add(itemData as StockItem);
        onSaved({ ...itemData, id });
      }
      onClose();
    } catch (err) {
      console.error('Failed to save stock item:', err);
      setError('Error saving stock to database');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={itemToEdit ? 'Edit Stock Item' : 'New Product / Service'}
      footer={
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleSave();
          }}
          disabled={isSubmitting}
          className={`w-full h-12 bg-iosBlue text-white rounded-[12px] font-semibold text-[16px] active:opacity-85 shadow-md shadow-iosBlue/20 transition-opacity flex items-center justify-center space-x-2 ${
            isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {category === 'product' ? <Package className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
          <span>{itemToEdit ? 'Update Stock Item' : 'Add to Stock'}</span>
        </button>
      }
    >
      <form id="add-stock-form" onSubmit={(e) => { e.preventDefault(); handleSave(e); }} className="space-y-4 pt-1">
        {error && (
          <div className="bg-red-50 text-iosRed p-2.5 rounded-[10px] text-xs font-medium">
            {error}
          </div>
        )}

        {/* 1. Category Switcher (Product vs Service) */}
        <div>
          <label className="text-xs font-semibold text-[#8E8E93] ml-1 mb-1.5 block">
            Item Type
          </label>
          <SegmentedControl<StockCategory>
            value={category}
            onChange={(cat) => {
              setCategory(cat);
              setUnit(cat === 'product' ? 'pcs' : 'service');
            }}
            size="md"
            options={[
              { value: 'product', label: 'Product (Inventory)' },
              { value: 'service', label: 'Service / Labour' },
            ]}
          />
        </div>

        {/* 2. Item Name & Quick suggestions */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#8E8E93] ml-1">
            {category === 'product' ? 'Product Name' : 'Service Name'} *
          </label>
          <input
            ref={nameInputRef}
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder={
              category === 'product'
                ? 'e.g. Tempered Glass 11D, Type-C Cable'
                : 'e.g. Display Replacement, Charging Port Repair'
            }
            className="w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-[15px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
          />

        </div>

        {/* 3. Pricing Row: Selling Price & Cost Price */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1 bg-[#F2F2F7] p-3 rounded-[12px] border border-black/[0.04]">
            <label className="text-xs font-semibold text-[#8E8E93] block">
              Selling Price (₹) *
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xl font-bold text-black select-none">₹</span>
              <input
                type="text"
                inputMode="decimal"
                required
                value={sellingPriceStr}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^[0-9,.]*$/.test(val)) setSellingPriceStr(val);
                }}
                placeholder="0"
                className="w-full text-2xl font-bold text-black bg-transparent focus:outline-none placeholder:text-gray-300"
              />
            </div>
            <span className="text-[10px] text-[#8E8E93]">Customer charge</span>
          </div>

          <div className="space-y-1 bg-[#F2F2F7] p-3 rounded-[12px] border border-black/[0.04]">
            <label className="text-xs font-semibold text-[#8E8E93] block">
              Cost Price (₹) <span className="text-[10px] font-normal text-gray-400">Optional</span>
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xl font-bold text-gray-400 select-none">₹</span>
              <input
                type="text"
                inputMode="decimal"
                value={costPriceStr}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^[0-9,.]*$/.test(val)) setCostPriceStr(val);
                }}
                placeholder="0"
                className="w-full text-2xl font-bold text-gray-700 bg-transparent focus:outline-none placeholder:text-gray-300"
              />
            </div>
            <span className="text-[10px] text-[#8E8E93]">Your purchase cost</span>
          </div>
        </div>

        {/* 4. Product-Specific Inventory Fields */}
        {category === 'product' && (
          <div className="space-y-3 bg-white p-3.5 rounded-[12px] border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-black block">
                  Current Stock Quantity
                </label>
                <span className="text-[11px] text-[#8E8E93]">Items physically in your shop</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => {
                    const current = parseInt(quantityStr, 10) || 0;
                    const next = Math.max(0, current - 1);
                    setQuantityStr(next === 0 ? '' : String(next));
                  }}
                  className="w-8 h-8 rounded-full bg-[#F2F2F7] active:bg-gray-300 flex items-center justify-center text-gray-700 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={quantityStr}
                  onFocus={(e) => {
                    if (e.target.value === '0') {
                      setQuantityStr('');
                    } else {
                      e.target.select();
                    }
                  }}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length > 1 && val.startsWith('0')) {
                      val = val.replace(/^0+/, '');
                    }
                    if (val === '0') {
                      val = '';
                    }
                    setQuantityStr(val);
                  }}
                  placeholder="0"
                  className="w-16 text-center font-bold text-lg text-black bg-[#F2F2F7] rounded-[8px] py-1 focus:outline-none focus:ring-1 focus:ring-iosBlue"
                />
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => {
                    const current = parseInt(quantityStr, 10) || 0;
                    setQuantityStr(String(current + 1));
                  }}
                  className="w-8 h-8 rounded-full bg-[#F2F2F7] active:bg-gray-300 flex items-center justify-center text-gray-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick stock preset chips */}
            <div className="flex items-center space-x-1.5 pt-1">
              <span className="text-[10px] text-[#8E8E93]">Quick add:</span>
              {[5, 10, 25, 50].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    const current = parseInt(quantityStr, 10) || 0;
                    setQuantityStr(String(current + num));
                  }}
                  className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md text-[11px] font-medium"
                >
                  +{num}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#8E8E93]">
                  Low Stock Warning At
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={lowStockThresholdStr}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length > 1 && val.startsWith('0')) {
                      val = val.replace(/^0+/, '');
                    }
                    setLowStockThresholdStr(val);
                  }}
                  placeholder="5"
                  className="w-full bg-[#F2F2F7] rounded-[8px] px-2.5 py-1.5 text-xs text-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-[#8E8E93]">
                    Barcode / SKU
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="text-[11px] font-semibold text-iosBlue hover:underline flex items-center space-x-0.5"
                  >
                    <ScanBarcode className="w-3 h-3" />
                    <span>Scan</span>
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Optional code"
                    className="w-full bg-[#F2F2F7] rounded-[8px] pl-2.5 pr-8 py-1.5 text-xs font-mono text-black focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="absolute right-1 text-gray-400 hover:text-iosBlue p-1 transition-colors"
                    title="Scan Barcode"
                  >
                    <ScanBarcode className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. Notes / Details */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#8E8E93] ml-1">
            Notes / Warranty / Specs (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={category === 'product' ? 'e.g. 6 months warranty, fits all models' : 'e.g. 30 days display warranty'}
            className="w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2 text-[14px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
          />
        </div>

        {/* 6. Delete Item Option (Only visible when editing an existing item) */}
        {itemToEdit && onDelete && (
          <div className="pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                const target = itemToEdit;
                onClose();
                onDelete(target);
              }}
              className="w-full py-3 rounded-[12px] bg-red-50 text-iosRed font-semibold text-[14px] border border-red-200/80 hover:bg-red-100 flex items-center justify-center space-x-2 active:scale-98 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete {category === 'product' ? 'Product' : 'Service'}</span>
            </button>
          </div>
        )}
      </form>

      {/* Barcode Scanner Modal */}
      {isScannerOpen && (
        <BarcodeScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScan={(code) => {
            setSku(code);
            setIsScannerOpen(false);
          }}
          title="Scan Product Barcode"
        />
      )}
    </BottomSheet>
  );
};
