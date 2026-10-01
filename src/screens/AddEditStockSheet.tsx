import React, { useState, useEffect, useRef } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { SegmentedControl } from '../components/SegmentedControl';
import { StockItem, StockCategory, Language } from '../types';
import { db } from '../db/db';
import { Package, Wrench, Sparkles, Plus, Minus, Tag } from 'lucide-react';

interface AddEditStockSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (item: StockItem) => void;
  itemToEdit: StockItem | null;
  language: Language;
  defaultCategory?: StockCategory;
}

const COMMON_SUGGESTIONS: { label: string; category: StockCategory; defaultPrice?: number; defaultCost?: number }[] = [
  { label: 'Tempered Glass 11D', category: 'product', defaultPrice: 150, defaultCost: 35 },
  { label: 'Type-C Fast Cable', category: 'product', defaultPrice: 250, defaultCost: 60 },
  { label: 'Display Combo Replacement', category: 'service', defaultPrice: 1800, defaultCost: 1100 },
  { label: 'Battery Replacement', category: 'service', defaultPrice: 950, defaultCost: 450 },
  { label: 'Charging Port / CC Board Repair', category: 'service', defaultPrice: 450, defaultCost: 120 },
  { label: 'Smoke Matte Back Cover', category: 'product', defaultPrice: 180, defaultCost: 45 },
  { label: '20W Fast Charger Adapter', category: 'product', defaultPrice: 599, defaultCost: 210 },
  { label: 'Software Flashing / Reset', category: 'service', defaultPrice: 500, defaultCost: 0 },
  { label: 'Ear Receiver / Speaker Repair', category: 'service', defaultPrice: 350, defaultCost: 80 },
  { label: 'Camera Lens Protector', category: 'product', defaultPrice: 120, defaultCost: 25 },
];

export const AddEditStockSheet: React.FC<AddEditStockSheetProps> = ({
  isOpen,
  onClose,
  onSaved,
  itemToEdit,
  language: _language,
  defaultCategory = 'product',
}) => {
  const [category, setCategory] = useState<StockCategory>(defaultCategory);
  const [name, setName] = useState('');
  const [sellingPriceStr, setSellingPriceStr] = useState('');
  const [costPriceStr, setCostPriceStr] = useState('');
  const [quantity, setQuantity] = useState<number>(10);
  const [unit, setUnit] = useState('pcs');
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [sku, setSku] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setCategory(itemToEdit.category);
        setName(itemToEdit.name);
        setSellingPriceStr(itemToEdit.sellingPrice ? itemToEdit.sellingPrice.toString() : '');
        setCostPriceStr(itemToEdit.costPrice !== undefined && itemToEdit.costPrice !== null ? itemToEdit.costPrice.toString() : '');
        setQuantity(typeof itemToEdit.quantity === 'number' ? itemToEdit.quantity : 10);
        setUnit(itemToEdit.unit || (itemToEdit.category === 'product' ? 'pcs' : 'service'));
        setLowStockThreshold(typeof itemToEdit.lowStockThreshold === 'number' ? itemToEdit.lowStockThreshold : 5);
        setSku(itemToEdit.sku || '');
        setNotes(itemToEdit.notes || '');
      } else {
        setCategory(defaultCategory);
        setName('');
        setSellingPriceStr('');
        setCostPriceStr('');
        setQuantity(10);
        setUnit(defaultCategory === 'product' ? 'pcs' : 'service');
        setLowStockThreshold(5);
        setSku('');
        setNotes('');
      }
      setError(null);

      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, itemToEdit, defaultCategory]);

  const handleApplySuggestion = (sug: typeof COMMON_SUGGESTIONS[0]) => {
    setName(sug.label);
    setCategory(sug.category);
    setUnit(sug.category === 'product' ? 'pcs' : 'service');
    if (sug.defaultPrice) setSellingPriceStr(sug.defaultPrice.toString());
    if (sug.defaultCost) setCostPriceStr(sug.defaultCost.toString());
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter item or service name');
      nameInputRef.current?.focus();
      return;
    }

    const cleanSell = sellingPriceStr.replace(/,/g, '').trim();
    const parsedSell = parseFloat(cleanSell);
    if (isNaN(parsedSell) || parsedSell < 0 || parsedSell > 9999999) {
      setError('Please enter a valid selling price');
      return;
    }

    let parsedCost: number | undefined = undefined;
    if (costPriceStr.trim()) {
      const cleanCost = costPriceStr.replace(/,/g, '').trim();
      const pCost = parseFloat(cleanCost);
      if (isNaN(pCost) || pCost < 0 || pCost > 9999999) {
        setError('Please enter a valid cost price');
        return;
      }
      parsedCost = pCost;
    }

    try {
      const itemData: Omit<StockItem, 'id'> = {
        name: trimmedName,
        category,
        sellingPrice: parsedSell,
        costPrice: parsedCost,
        quantity: category === 'product' ? Math.max(0, quantity) : undefined,
        unit: unit.trim() || (category === 'product' ? 'pcs' : 'service'),
        lowStockThreshold: category === 'product' ? Math.max(1, lowStockThreshold) : undefined,
        sku: sku.trim() || undefined,
        notes: notes.trim() || undefined,
        createdAt: itemToEdit?.createdAt || Date.now(),
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
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={itemToEdit ? 'Edit Stock Item' : 'New Product / Service'}
    >
      <form onSubmit={handleSave} className="space-y-4 pt-1">
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
              { value: 'product', label: '📦 Product (Inventory)' },
              { value: 'service', label: '🛠️ Service / Labour' },
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

          {/* Quick suggestions chips */}
          {!itemToEdit && (
            <div className="pt-1">
              <span className="text-[11px] text-[#8E8E93] font-medium flex items-center gap-1 mb-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Quick Mobile Shop Presets:
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                {COMMON_SUGGESTIONS.filter((s) => s.category === category).map((sug) => (
                  <button
                    key={sug.label}
                    type="button"
                    onClick={() => handleApplySuggestion(sug)}
                    className="shrink-0 bg-white border border-gray-200/80 hover:border-iosBlue text-gray-700 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all active:scale-95 shadow-xs"
                  >
                    + {sug.label}
                  </button>
                ))}
              </div>
            </div>
          )}
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
                  onClick={() => setQuantity((q) => Math.max(0, q - 1))}
                  className="w-8 h-8 rounded-full bg-[#F2F2F7] active:bg-gray-300 flex items-center justify-center text-gray-700 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-14 text-center font-bold text-lg text-black bg-[#F2F2F7] rounded-[8px] py-1 focus:outline-none focus:ring-1 focus:ring-iosBlue"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
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
                  onClick={() => setQuantity((q) => q + num)}
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
                  type="number"
                  min="1"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                  placeholder="5"
                  className="w-full bg-[#F2F2F7] rounded-[8px] px-2.5 py-1.5 text-xs text-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#8E8E93]">
                  Barcode / SKU
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Optional code"
                  className="w-full bg-[#F2F2F7] rounded-[8px] px-2.5 py-1.5 text-xs font-mono text-black focus:outline-none"
                />
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

        {/* Submit button */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full h-12 bg-iosBlue text-white rounded-[12px] font-semibold text-[16px] active:opacity-85 shadow-md shadow-iosBlue/20 transition-opacity flex items-center justify-center space-x-2"
          >
            {category === 'product' ? <Package className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
            <span>{itemToEdit ? 'Update Stock Item' : 'Add to Stock'}</span>
          </button>
        </div>
      </form>
    </BottomSheet>
  );
};
