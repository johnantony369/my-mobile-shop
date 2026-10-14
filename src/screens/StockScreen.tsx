import { FloatingAction } from '../components/FloatingAction';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, softDeleteStockItem, adjustStockQuantity } from '../db/db';
import { StockItem, StockCategory, Language, UsedDevice } from '../types';
import { formatINR } from '../i18n';
import { AddEditStockSheet } from './AddEditStockSheet';
import { ConfirmModal } from '../components/ConfirmModal';
import { UsedPhonesView } from './UsedPhonesView';
import { AddEditUsedPhoneSheet } from './AddEditUsedPhoneSheet';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import {
  Package,
  Wrench,
  Search,
  Plus,
  Minus,
  AlertTriangle,
  Edit2,
  Boxes,
  X,
  ScanBarcode,
  CheckCircle2,
} from 'lucide-react';

interface StockScreenProps {
  language: Language;
  shopName: string;
  isReadOnly?: boolean;
  isActivated?: boolean;
  onOpenPaywall?: () => void;
}

type FilterTab = 'all' | 'product' | 'service' | 'low_stock';

export const StockScreen: React.FC<StockScreenProps> = ({
  language,
  shopName,
  isReadOnly = false,
  isActivated: _isActivated,
  onOpenPaywall,
}) => {
  const [currentFilter, setCurrentFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<StockItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);
  const [defaultAddCategory, setDefaultAddCategory] = useState<StockCategory>('product');
  const [view, setView] = useState<'stock' | 'preowned'>('stock');
  const [isAddPreownedOpen, setIsAddPreownedOpen] = useState(false);
  const [editingPreowned, setEditingPreowned] = useState<UsedDevice | null>(null);

  // Barcode scanning state
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scannedInitialSku, setScannedInitialSku] = useState('');
  const [matchedProduct, setMatchedProduct] = useState<StockItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  const preownedCount =
    useLiveQuery(
      async () => {
        try {
          if (!db.usedDevices) return 0;
          const items = await db.usedDevices.toArray();
          return items.filter((d) => !d.deletedAt && d.syncStatus !== 'deleted' && d.status === 'in_stock').length;
        } catch {
          return 0;
        }
      },
      []
    ) ?? 0;

  // Scroll listener for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Live query for active stock items
  const allStockItems = useLiveQuery(
    async () => {
      try {
        if (!db.stock) return [];
        const items = await db.stock.toArray();
        return items
          .filter((i) => !i.deletedAt && i.syncStatus !== 'deleted')
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      } catch (err) {
        console.warn('Error reading stock items:', err);
        return [];
      }
    },
    []
  ) ?? [];

  // Metrics calculation
  const metrics = useMemo(() => {
    let productCount = 0;
    let serviceCount = 0;
    let lowStockCount = 0;
    let totalStockUnits = 0;
    let totalEstimatedValue = 0;

    for (const item of allStockItems) {
      if (item.category === 'product') {
        productCount++;
        const qty = item.quantity ?? 0;
        const threshold = item.lowStockThreshold || 5;
        totalStockUnits += qty;
        totalEstimatedValue += qty * (item.sellingPrice || 0);
        if (qty <= threshold) {
          lowStockCount++;
        }
      } else {
        serviceCount++;
      }
    }

    return {
      total: allStockItems.length,
      productCount,
      serviceCount,
      lowStockCount,
      totalStockUnits,
      totalEstimatedValue,
    };
  }, [allStockItems]);

  // Filtered list
  const displayedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allStockItems.filter((item) => {
      if (!item) return false;
      // Filter tab
      if (currentFilter === 'product' && item.category !== 'product') return false;
      if (currentFilter === 'service' && item.category !== 'service') return false;
      if (currentFilter === 'low_stock') {
        if (item.category !== 'product') return false;
        const qty = item.quantity ?? 0;
        const threshold = item.lowStockThreshold || 5;
        if (qty > threshold) return false;
      }

      // Search query
      if (!q) return true;
      const matchName = item.name ? item.name.toLowerCase().includes(q) : false;
      const matchSku = item.sku ? item.sku.toLowerCase().includes(q) : false;
      const matchNotes = item.notes ? item.notes.toLowerCase().includes(q) : false;
      return matchName || matchSku || matchNotes;
    });
  }, [allStockItems, currentFilter, searchQuery]);

  const handleOpenAdd = (category: StockCategory = 'product') => {
    setItemToEdit(null);
    setDefaultAddCategory(category);
    setIsAddSheetOpen(true);
  };

  const handleOpenEdit = (item: StockItem) => {
    setItemToEdit(item);
    setDefaultAddCategory(item.category);
    setIsAddSheetOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete && itemToDelete.id) {
      await softDeleteStockItem(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  const handleQuickAdjust = async (
    e: React.MouseEvent,
    id: number,
    delta: number,
    currentQty: number,
    unit = 'pcs'
  ) => {
    e.stopPropagation();
    await adjustStockQuantity(id, delta);
    const updated = Math.max(0, currentQty + delta);
    showToast(`Stock updated: ${updated} ${unit}`);
  };

  const handleBarcodeScanned = (scannedCode: string) => {
    setIsScanModalOpen(false);
    const code = scannedCode.trim();
    if (!code) return;

    // Search existing active stock items by SKU
    const match = allStockItems.find(
      (item) => item.sku && item.sku.trim().toLowerCase() === code.toLowerCase()
    );

    if (match) {
      setMatchedProduct(match);
    } else {
      // New product not in stock: Open Add Sheet with pre-filled SKU
      setScannedInitialSku(code);
      setItemToEdit(null);
      setDefaultAddCategory('product');
      setIsAddSheetOpen(true);
    }
  };

  const handleAddOneStock = async () => {
    if (!matchedProduct || !matchedProduct.id) return;
    await adjustStockQuantity(matchedProduct.id, 1);
    const newQty = (matchedProduct.quantity ?? 0) + 1;
    setMatchedProduct({ ...matchedProduct, quantity: newQty });
    setToastMessage(`Stock +1: "${matchedProduct.name}" is now ${newQty} units`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="min-h-screen pb-28">
      {/* Sticky top navigation bar for collapsed title */}
      <div
        className={`sticky top-0 z-30 transition-all duration-200 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-[#E5E5EA] py-2.5'
            : 'bg-transparent py-1'
        }`}
      >
        <div className="max-w-lg mx-auto px-4 flex items-center justify-between">
          <span
            className={`text-[17px] font-bold text-black transition-opacity duration-200 ${
              isScrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            Stock & Inventory
          </span>
          {isScrolled && (
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setIsScanModalOpen(true)}
                disabled={isReadOnly}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 flex items-center justify-center transition-transform active:scale-95"
                title="Scan Barcode"
                aria-label="Scan Barcode"
              >
                <ScanBarcode className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4">
        {/* Header Title & Quick Actions */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[26px] sm:text-[28px] font-extrabold text-black tracking-tight leading-tight truncate">
              {shopName || 'QuickFix'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Stock Inventory</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Barcode Scanner Button */}
            <button
              type="button"
              onClick={() => setIsScanModalOpen(true)}
              disabled={isReadOnly}
              aria-label="Scan Barcode"
              title="Scan Barcode"
              className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-800 flex items-center justify-center shadow-xs border border-black/[0.04] transition-all"
            >
              <ScanBarcode className="w-5 h-5 text-gray-800" />
            </button>
          </div>
        </div>

        {/* Catalog Switcher with Current Toggle Texts */}
        <div className="w-full bg-[#E9E9EB] p-1 rounded-xl">
          <div className="grid grid-cols-2 gap-1" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'stock'}
              onClick={() => setView('stock')}
              className={`py-2 px-2 rounded-lg font-semibold text-[13px] text-center transition-all ${
                view === 'stock'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              New Stock ({allStockItems.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'preowned'}
              onClick={() => setView('preowned')}
              className={`py-2 px-2 rounded-lg font-semibold text-[13px] text-center transition-all ${
                view === 'preowned'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              Pre-Owned ({preownedCount})
            </button>
          </div>
        </div>

        {view === 'stock' ? (
        <>
        {/* Bento KPI Row */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Card 1: Valuation */}
          <button
            type="button"
            onClick={() => setCurrentFilter(currentFilter === 'product' ? 'all' : 'product')}
            className={`bg-white rounded-2xl p-3.5 border text-left shadow-xs transition-all flex flex-col justify-between ${
              currentFilter === 'product'
                ? 'border-iosBlue ring-2 ring-iosBlue/20'
                : 'border-black/[0.05] hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Total Valuation
              </span>
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-iosBlue flex items-center justify-center">
                <Package className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-extrabold text-black tracking-tight leading-tight">
                {formatINR(metrics.totalEstimatedValue)}
              </div>
              <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-blue-50 text-iosBlue text-[10px] font-bold">
                <span>{metrics.totalStockUnits} units in shop</span>
              </div>
            </div>
          </button>

          {/* Card 2: Low Stock Alert */}
          <button
            type="button"
            onClick={() => setCurrentFilter(currentFilter === 'low_stock' ? 'all' : 'low_stock')}
            className={`bg-white rounded-2xl p-3.5 border text-left shadow-xs transition-all flex flex-col justify-between ${
              currentFilter === 'low_stock'
                ? 'border-red-500 ring-2 ring-red-500/20'
                : 'border-black/[0.05] hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Low Stock Alert
              </span>
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  metrics.lowStockCount > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div
                className={`text-xl sm:text-2xl font-extrabold tracking-tight leading-tight ${
                  metrics.lowStockCount > 0 ? 'text-red-600' : 'text-black'
                }`}
              >
                {metrics.lowStockCount} Items
              </div>
              <div
                className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  metrics.lowStockCount > 0
                    ? 'bg-red-50 text-red-700 border border-red-200/60'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                }`}
              >
                <span>{metrics.lowStockCount > 0 ? 'Restock Required' : 'All Stocked'}</span>
              </div>
            </div>
          </button>
        </div>

        {/* Search Bar with Integrated Barcode Scan Button */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products, services, barcode..."
            className="w-full h-11 pl-10 pr-11 bg-white rounded-xl text-[14px] text-black placeholder:text-gray-400 shadow-xs border border-black/[0.06] focus:outline-none focus:ring-2 focus:ring-iosBlue/30 transition-all"
          />
          <button
            type="button"
            onClick={() => setIsScanModalOpen(true)}
            aria-label="Scan barcode input"
            title="Scan Barcode"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-iosBlue hover:text-blue-700 active:scale-90 transition-transform"
          >
            <ScanBarcode className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar momentum-scroll py-0.5 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setCurrentFilter('all')}
            className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold shadow-xs transition-all ${
              currentFilter === 'all'
                ? 'bg-black text-white'
                : 'bg-white text-gray-600 border border-black/[0.06] hover:bg-gray-100'
            }`}
          >
            All ({allStockItems.length})
          </button>
          <button
            type="button"
            onClick={() => setCurrentFilter('product')}
            className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all ${
              currentFilter === 'product'
                ? 'bg-iosBlue text-white'
                : 'bg-white text-gray-600 border border-black/[0.06] hover:bg-gray-100'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Products ({metrics.productCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentFilter('service')}
            className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all ${
              currentFilter === 'service'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-black/[0.06] hover:bg-gray-100'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Services ({metrics.serviceCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentFilter('low_stock')}
            className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all ${
              currentFilter === 'low_stock'
                ? 'bg-red-600 text-white'
                : 'bg-white text-red-700 border border-red-200 hover:bg-red-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span>Low Stock ({metrics.lowStockCount})</span>
          </button>
        </div>

        {/* Stock Items List */}
        {displayedItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-black/[0.04] shadow-xs space-y-4 my-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-iosBlue flex items-center justify-center mx-auto shadow-inner">
              <Boxes className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-black">
                {searchQuery ? 'No matching items found' : 'Your stock list is empty'}
              </h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                {searchQuery
                  ? `No products or services match "${searchQuery}". Try a different keyword.`
                  : 'Add the items you sell and repair services you offer to quickly add them in Daily Book and Repairs.'}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenAdd('product')}
                className="w-full sm:w-auto px-4 py-2.5 bg-iosBlue text-white rounded-full text-xs font-semibold active:scale-95 shadow-sm flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Item</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3" id="inventoryList">
            {displayedItems.map((item) => {
              const isProduct = item.category === 'product';
              const qty = item.quantity ?? 0;
              const threshold = item.lowStockThreshold || 5;
              const isOutOfStock = isProduct && qty <= 0;
              const isLowStock = isProduct && qty > 0 && qty <= threshold;
              const hasCost = typeof item.costPrice === 'number' && item.costPrice > 0;
              const margin = hasCost ? item.sellingPrice - (item.costPrice || 0) : null;

              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenEdit(item)}
                  className="bg-white rounded-2xl p-4 shadow-xs border border-black/[0.06] hover:border-gray-300 transition-all cursor-pointer flex flex-col gap-3"
                  data-item-id={item.id}
                >
                  {/* Top Row: Category Tag, SKU Chip, Name & Options */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isProduct
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {isProduct ? 'Product' : 'Service'}
                        </span>
                        {item.sku && (
                          <span className="text-[11px] font-mono text-gray-500 truncate">
                            #{item.sku}
                          </span>
                        )}
                      </div>
                      <h2 className="text-[16px] font-bold text-black leading-snug">
                        {item.name}
                      </h2>
                      {item.notes && (
                        <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5 font-normal">
                          {item.notes}
                        </p>
                      )}
                    </div>

                    <div
                      className="flex items-center space-x-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        title="Edit Item"
                        onClick={() => handleOpenEdit(item)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-iosBlue hover:bg-gray-100 active:scale-95 transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Financial Snapshot */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F4F3F8]">
                    <div className="flex items-center gap-2 text-gray-600 text-[13px]">
                      {hasCost ? (
                        <>
                          <span>
                            Cost: <strong className="text-black font-semibold">{formatINR(item.costPrice!)}</strong>
                          </span>
                          <span className="text-gray-300">•</span>
                          <span>
                            Sell: <strong className="text-black font-semibold">{formatINR(item.sellingPrice)}</strong>
                          </span>
                        </>
                      ) : (
                        <span>
                          Selling Price: <strong className="text-black font-semibold">{formatINR(item.sellingPrice)}</strong>
                        </span>
                      )}
                    </div>
                    {margin !== null && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        +{formatINR(margin)} margin
                      </span>
                    )}
                  </div>

                  {/* Inventory Status Pill & Stepper */}
                  <div className="flex items-center justify-between pt-0.5 gap-2">
                    {/* Status Pill on Left - STRICTLY NO short description under the pill */}
                    <div className="min-w-0 shrink">
                      {isProduct ? (
                        isOutOfStock ? (
                          /* Red for out of stock */
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-100 text-red-800 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                            <span className="truncate">Out of stock</span>
                          </div>
                        ) : isLowStock ? (
                          /* Red for low stock */
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-100 text-red-800 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                            <span className="truncate">Low Stock: {qty} {item.unit || 'pcs'}</span>
                          </div>
                        ) : (
                          /* Green for healthy stock */
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                            <span className="truncate">Stock: {qty} {item.unit || 'pcs'}</span>
                          </div>
                        )
                      ) : (
                        /* Blue for service */
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                          <span className="truncate">Service / Labour</span>
                        </div>
                      )}
                    </div>

                    {/* Tactile Quick Stepper on Right (Products only) */}
                    {isProduct && item.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 bg-[#EEEDF3] p-1 rounded-xl shrink-0"
                      >
                        <button
                          type="button"
                          aria-label="Reduce stock"
                          disabled={qty <= 0}
                          onClick={(e) => handleQuickAdjust(e, item.id!, -1, qty, item.unit)}
                          className="w-9 h-9 rounded-lg bg-white text-gray-700 font-bold text-[16px] flex items-center justify-center active:scale-90 disabled:opacity-40 transition-transform shadow-xs shrink-0"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-bold text-[15px] text-black min-w-[42px] px-1.5 text-center select-none tabular-nums">
                          {qty}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase stock"
                          onClick={(e) => handleQuickAdjust(e, item.id!, 1, qty, item.unit)}
                          className="w-9 h-9 rounded-lg bg-iosBlue text-white font-bold text-[16px] flex items-center justify-center active:scale-90 transition-transform shadow-xs shadow-iosBlue/25 shrink-0"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </>
        ) : (
          <UsedPhonesView
            shopName={shopName}
            hideHeader={true}
            onOpenAdd={() => {
              setEditingPreowned(null);
              setIsAddPreownedOpen(true);
            }}
            onEditDevice={(device) => {
              setEditingPreowned(device);
              setIsAddPreownedOpen(true);
            }}
          />
        )}
      </div>

      {/* Floating Action Button */}
      <FloatingAction>
        <button
          type="button"
          onClick={() => {
            if (isReadOnly && onOpenPaywall) {
              onOpenPaywall();
            } else if (view === 'stock') {
              handleOpenAdd(currentFilter === 'service' ? 'service' : 'product');
            } else {
              setEditingPreowned(null);
              setIsAddPreownedOpen(true);
            }
          }}
          className="h-13 px-5 py-3 rounded-full flex items-center space-x-2 font-bold text-[15px] shadow-lg active:scale-95 transition-all duration-150 text-white bg-iosBlue shadow-iosBlue/35 hover:bg-blue-600"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>{view === 'stock' ? 'Add Item' : 'New Intake'}</span>
        </button>
      </FloatingAction>

      {/* Add / Edit Sheet Modal */}
      {isAddSheetOpen && (
        <AddEditStockSheet
          isOpen={isAddSheetOpen}
          onClose={() => {
            setIsAddSheetOpen(false);
            setScannedInitialSku('');
          }}
          onSaved={() => {
            setIsAddSheetOpen(false);
            setScannedInitialSku('');
          }}
          onDelete={(item) => {
            setIsAddSheetOpen(false);
            setItemToDelete(item);
          }}
          itemToEdit={itemToEdit}
          language={language}
          defaultCategory={defaultAddCategory}
          initialSku={scannedInitialSku}
        />
      )}

      {/* Barcode Scanner Modal */}
      {isScanModalOpen && (
        <BarcodeScannerModal
          isOpen={isScanModalOpen}
          onClose={() => setIsScanModalOpen(false)}
          onScan={handleBarcodeScanned}
          title="Scan Product Barcode"
        />
      )}

      {/* Matched Product Result Sheet */}
      {matchedProduct &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-white rounded-t-[24px] shadow-2xl p-5 border-t border-gray-100 animate-in slide-in-from-bottom duration-200 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
                      Product in Stock
                    </span>
                    <h3 className="text-lg font-bold text-black leading-tight">
                      {matchedProduct.name}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMatchedProduct(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Barcode & Price Details Card */}
              <div className="bg-[#F2F2F7] rounded-[16px] p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="font-medium">Barcode / SKU:</span>
                  <span className="font-mono font-bold text-gray-800 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                    {matchedProduct.sku}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200/60 pt-2">
                  <div>
                    <span className="text-[11px] text-gray-500 block">Selling Price</span>
                    <span className="text-xl font-extrabold text-black">
                      {formatINR(matchedProduct.sellingPrice)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-gray-500 block">Current Stock</span>
                    <span
                      className={`text-xl font-extrabold ${
                        (matchedProduct.quantity ?? 0) <= (matchedProduct.lowStockThreshold || 5)
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {matchedProduct.quantity ?? 0} {matchedProduct.unit || 'pcs'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Toast Feedback */}
              {toastMessage && (
                <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl text-xs font-semibold text-center border border-emerald-200 animate-in fade-in">
                  {toastMessage}
                </div>
              )}

              {/* Actions Grid */}
              <div className="grid grid-cols-2 gap-2.5 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:pb-5">
                <button
                  type="button"
                  onClick={handleAddOneStock}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center space-x-1.5 transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add 1 Stock Unit</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const item = matchedProduct;
                    setMatchedProduct(null);
                    if (item) handleOpenEdit(item);
                  }}
                  className="w-full py-3 bg-iosBlue hover:bg-blue-600 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md shadow-iosBlue/25 flex items-center justify-center space-x-1.5 transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMatchedProduct(null);
                    setIsScanModalOpen(true);
                  }}
                  className="col-span-1 py-2.5 bg-gray-100 hover:bg-gray-200 active:scale-98 text-gray-800 rounded-xl font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all"
                >
                  <ScanBarcode className="w-3.5 h-3.5" />
                  <span>Scan Next</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMatchedProduct(null)}
                  className="col-span-1 py-2.5 bg-gray-100 hover:bg-gray-200 active:scale-98 text-gray-600 rounded-xl font-semibold text-xs transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Add / Edit Pre-Owned Sheet Modal */}
      <AddEditUsedPhoneSheet
        isOpen={isAddPreownedOpen}
        onClose={() => {
          setIsAddPreownedOpen(false);
          setEditingPreowned(null);
        }}
        deviceToEdit={editingPreowned}
        shopName={shopName}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Delete Stock Item?"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? You can re-add it anytime.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setItemToDelete(null)}
      />

      {/* Microfeedback Toast Overlay */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 pointer-events-none select-none">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
