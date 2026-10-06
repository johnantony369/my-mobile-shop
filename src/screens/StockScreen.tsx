import { FloatingAction } from '../components/FloatingAction';
import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, softDeleteStockItem, adjustStockQuantity } from '../db/db';
import { StockItem, StockCategory, Language, UsedDevice } from '../types';
import { formatINR } from '../i18n';
import { AddEditStockSheet } from './AddEditStockSheet';
import { ConfirmModal } from '../components/ConfirmModal';
import { UsedPhonesView } from './UsedPhonesView';
import { AddEditUsedPhoneSheet } from './AddEditUsedPhoneSheet';
import {
  Package,
  Wrench,
  Search,
  Plus,
  Minus,
  AlertTriangle,
  Edit2,
  Trash2,
  Boxes,
  X,
  TrendingUp,
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
      const matchName = item.name.toLowerCase().includes(q);
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

  const handleQuickAdjust = async (e: React.MouseEvent, id: number, delta: number) => {
    e.stopPropagation();
    await adjustStockQuantity(id, delta);
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
            <button
              type="button"
              onClick={() => {
                if (view === 'stock') {
                  handleOpenAdd('product');
                } else {
                  setEditingPreowned(null);
                  setIsAddPreownedOpen(true);
                }
              }}
              className="bg-iosBlue text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center space-x-1 shadow-xs active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{view === 'stock' ? 'Add' : 'Intake'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4">
        {/* Large Header Title & Action */}
        <div className="pt-2 flex items-start justify-between">
          <div>
            <span className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider block">
              {shopName || 'My Mobile Shop'}
            </span>
            <h1 className="text-[32px] font-extrabold text-black tracking-tight leading-tight">
              Stock
            </h1>
          </div>
          {view === 'stock' ? (
            <button
              type="button"
              onClick={() => handleOpenAdd('product')}
              disabled={isReadOnly}
              className="mt-1 bg-iosBlue hover:bg-blue-600 active:scale-95 text-white font-semibold text-[14px] px-4 py-2.5 rounded-full shadow-md shadow-iosBlue/25 flex items-center space-x-1.5 transition-all select-none"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Item</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditingPreowned(null);
                setIsAddPreownedOpen(true);
              }}
              disabled={isReadOnly}
              className="mt-1 bg-iosBlue hover:bg-blue-600 active:scale-95 text-white font-semibold text-[14px] px-4 py-2.5 rounded-full shadow-md shadow-iosBlue/25 flex items-center space-x-1.5 transition-all select-none"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Intake</span>
            </button>
          )}
        </div>

        {/* View Toggle: Stock / Pre-Owned */}
        <div className="flex bg-[#E9E9EB] rounded-[12px] p-1">
          <button
            type="button"
            onClick={() => setView('stock')}
            className={`flex-1 py-2 rounded-[9px] text-[13px] font-semibold transition-all ${
              view === 'stock' ? 'bg-white text-black shadow-xs' : 'text-gray-500'
            }`}
          >
            New Stock ({allStockItems.length})
          </button>
          <button
            type="button"
            onClick={() => setView('preowned')}
            className={`flex-1 py-2 rounded-[9px] text-[13px] font-semibold transition-all ${
              view === 'preowned' ? 'bg-white text-black shadow-xs' : 'text-gray-500'
            }`}
          >
            Pre-Owned ({preownedCount})
          </button>
        </div>

        {view === 'stock' ? (
        <>
        {/* Quick Summary Cards Carousel */}
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory momentum-scroll overscroll-x-contain touch-pan-x pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {/* Card 1: Total Products */}
          <button
            type="button"
            onClick={() => setCurrentFilter(currentFilter === 'product' ? 'all' : 'product')}
            className={`min-w-[130px] flex-1 snap-start p-3 rounded-[16px] text-left transition-all border shrink-0 ${
              currentFilter === 'product'
                ? 'bg-blue-50/80 border-iosBlue ring-2 ring-iosBlue/20 shadow-xs'
                : 'bg-white border-black/[0.05] shadow-xs hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between text-iosBlue mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-blue-100/70 flex items-center justify-center">
                <Package className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Products
              </span>
            </div>
            <div className="text-xl font-extrabold text-black tracking-tight">
              {metrics.productCount}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5 whitespace-nowrap">
              {metrics.totalStockUnits} units in shop
            </div>
          </button>

          {/* Card 2: Services */}
          <button
            type="button"
            onClick={() => setCurrentFilter(currentFilter === 'service' ? 'all' : 'service')}
            className={`min-w-[130px] flex-1 snap-start p-3 rounded-[16px] text-left transition-all border shrink-0 ${
              currentFilter === 'service'
                ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                : 'bg-white border-black/[0.05] shadow-xs hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between text-purple-600 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-purple-100/70 flex items-center justify-center">
                <Wrench className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Services
              </span>
            </div>
            <div className="text-xl font-extrabold text-black tracking-tight">
              {metrics.serviceCount}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5 whitespace-nowrap">
              Repair & labour
            </div>
          </button>

          {/* Card 3: Low Stock Alerts */}
          <button
            type="button"
            onClick={() => setCurrentFilter(currentFilter === 'low_stock' ? 'all' : 'low_stock')}
            className={`min-w-[130px] flex-1 snap-start p-3 rounded-[16px] text-left transition-all border shrink-0 ${
              currentFilter === 'low_stock'
                ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                : metrics.lowStockCount > 0
                ? 'bg-amber-50/40 border-amber-200/80 shadow-xs hover:border-amber-400'
                : 'bg-white border-black/[0.05] shadow-xs hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between text-amber-600 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-amber-100/70 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Low Stock
              </span>
            </div>
            <div className={`text-xl font-extrabold tracking-tight ${metrics.lowStockCount > 0 ? 'text-amber-600' : 'text-black'}`}>
              {metrics.lowStockCount}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5 whitespace-nowrap">
              {metrics.lowStockCount > 0 ? 'Needs reorder' : 'All well-stocked'}
            </div>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products, services, barcode..."
            className="w-full bg-[#F2F2F7] rounded-[12px] pl-10 pr-9 py-2.5 text-[14px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04] transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar momentum-scroll overscroll-x-contain touch-pan-x py-0.5 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setCurrentFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 whitespace-nowrap transition-all ${
              currentFilter === 'all'
                ? 'bg-black text-white shadow-xs'
                : 'bg-white text-gray-600 border border-black/[0.05] hover:bg-gray-100'
            }`}
          >
            All Items ({allStockItems.length})
          </button>
          <button
            type="button"
            onClick={() => setCurrentFilter('product')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 whitespace-nowrap transition-all ${
              currentFilter === 'product'
                ? 'bg-iosBlue text-white shadow-xs'
                : 'bg-white text-gray-600 border border-black/[0.05] hover:bg-gray-100'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Products ({metrics.productCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentFilter('service')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 whitespace-nowrap transition-all ${
              currentFilter === 'service'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-gray-600 border border-black/[0.05] hover:bg-gray-100'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Services ({metrics.serviceCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentFilter('low_stock')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 whitespace-nowrap transition-all ${
              currentFilter === 'low_stock'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock ({metrics.lowStockCount})</span>
          </button>
        </div>

        {/* Stock Items List */}
        {displayedItems.length === 0 ? (
          <div className="bg-white rounded-[16px] p-8 text-center border border-black/[0.04] shadow-xs space-y-4 my-2">
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
          <div className="space-y-2.5">
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
                  className="bg-white rounded-[16px] p-3.5 border border-black/[0.06] shadow-xs hover:border-gray-300 active:bg-gray-50/80 transition-all cursor-pointer select-none space-y-2.5"
                >
                  {/* Top Row: Icon + Name/SKU + Price */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5 ${
                          isProduct
                            ? 'bg-blue-50 text-iosBlue'
                            : 'bg-purple-50 text-purple-600'
                        }`}
                      >
                        {isProduct ? <Package className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-[15px] text-black leading-snug break-words">
                            {item.name}
                          </h4>
                          {item.sku && (
                            <span className="font-mono text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded tracking-wide">
                              {item.sku}
                            </span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Price Block */}
                    <div className="text-right shrink-0">
                      <span className="text-[16px] font-extrabold text-black block tracking-tight leading-tight">
                        {formatINR(item.sellingPrice)}
                      </span>
                      {hasCost && (
                        <span className="text-[10px] text-gray-400 block font-medium">
                          Cost: {formatINR(item.costPrice!)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Row: Badges & Profit */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {isProduct ? (
                      isOutOfStock ? (
                        <span className="inline-flex items-center space-x-1 text-iosRed font-semibold bg-red-50 border border-red-200/80 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-iosRed inline-block" />
                          <span>Out of stock</span>
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center space-x-1 text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          <span>Low stock: {qty} left</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          <span>{qty} {item.unit || 'pcs'} in stock</span>
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-purple-700 font-semibold bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                        <span>Service / Labour</span>
                      </span>
                    )}

                    {margin !== null && (
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50/60 border border-emerald-200/60 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <TrendingUp className="w-2.5 h-2.5 text-iosGreen" />
                        <span>Profit: {formatINR(margin)}</span>
                      </span>
                    )}
                  </div>

                  {/* Bottom Row: Actions (Left) and Stepper / Details (Right) */}
                  <div className="pt-2 border-t border-gray-100/90 flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-xs">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(item);
                        }}
                        className="text-iosBlue hover:underline flex items-center space-x-1 py-1 font-medium"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemToDelete(item);
                        }}
                        className="text-iosRed hover:underline flex items-center space-x-1 py-1 font-medium"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>

                    {/* Right: Quick Stock Stepper (Product) or Tap to edit hint */}
                    {isProduct && item.id ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center space-x-1.5 bg-[#F2F2F7] px-1.5 py-0.5 rounded-full border border-black/[0.04]"
                      >
                        <button
                          type="button"
                          title="Decrease stock by 1"
                          onClick={(e) => handleQuickAdjust(e, item.id!, -1)}
                          disabled={qty <= 0}
                          className="w-7 h-7 rounded-full bg-white hover:bg-gray-100 active:scale-95 disabled:opacity-40 flex items-center justify-center text-gray-700 shadow-2xs transition-all"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-extrabold text-xs text-black min-w-[24px] text-center select-none">
                          {qty}
                        </span>
                        <button
                          type="button"
                          title="Increase stock by 1"
                          onClick={(e) => handleQuickAdjust(e, item.id!, 1)}
                          className="w-7 h-7 rounded-full bg-white hover:bg-gray-100 active:scale-95 flex items-center justify-center text-gray-700 shadow-2xs transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-400 font-medium">
                        Tap to edit
                      </span>
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
          onClose={() => setIsAddSheetOpen(false)}
          onSaved={() => setIsAddSheetOpen(false)}
          itemToEdit={itemToEdit}
          language={language}
          defaultCategory={defaultAddCategory}
        />
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
    </div>
  );
};
