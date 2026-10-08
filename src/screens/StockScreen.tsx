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
        {/* Large Header Title & Total Valuation Capsule */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <div>
            <span className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider block">
              {shopName || 'My Mobile Shop'}
            </span>
            <h1 className="text-[34px] font-black text-black tracking-tight leading-none mt-0.5">
              Stock
            </h1>
          </div>
          {/* Frosted Total Valuation Card */}
          <div className="bg-white/80 backdrop-blur-md border border-black/[0.06] rounded-2xl px-3.5 py-2 shadow-xs text-right">
            <span className="text-[10px] font-semibold text-[#8E8E93] uppercase tracking-wider block leading-tight">
              Total Value:
            </span>
            <span className="text-[16px] font-black text-black tracking-tight leading-tight block">
              {formatINR(metrics.totalEstimatedValue)}
            </span>
          </div>
        </div>

        {/* View Toggle: Stock / Pre-Owned */}
        <div className="flex bg-[#E5E5EA]/70 backdrop-blur-md rounded-full p-1 border border-black/[0.04]">
          <button
            type="button"
            onClick={() => setView('stock')}
            className={`flex-1 py-2 rounded-full text-[13px] font-bold transition-all ${
              view === 'stock' ? 'bg-white text-black shadow-xs' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            New Stock ({allStockItems.length})
          </button>
          <button
            type="button"
            onClick={() => setView('preowned')}
            className={`flex-1 py-2 rounded-full text-[13px] font-bold transition-all ${
              view === 'preowned' ? 'bg-white text-black shadow-xs' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Pre-Owned ({preownedCount})
          </button>
        </div>

        {view === 'stock' ? (
        <>
        {/* Quick Summary Bento Pill Bar */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-1.5 border border-black/[0.05] shadow-xs grid grid-cols-3 divide-x divide-black/[0.06]">
          {/* Card 1: Total Products */}
          <button
            type="button"
            onClick={() => setCurrentFilter(currentFilter === 'product' ? 'all' : 'product')}
            className={`p-2 rounded-xl text-left transition-all flex items-center space-x-2.5 ${
              currentFilter === 'product'
                ? 'bg-emerald-50/80 ring-1 ring-emerald-500/30'
                : 'hover:bg-black/[0.02]'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <Package className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block truncate">
                Products
              </span>
              <div className="text-[16px] font-black text-black tracking-tight leading-none mt-0.5">
                {metrics.productCount}
              </div>
            </div>
          </button>

          {/* Card 2: Services */}
          <button
            type="button"
            onClick={() => setCurrentFilter(currentFilter === 'service' ? 'all' : 'service')}
            className={`p-2 rounded-xl text-left transition-all flex items-center space-x-2.5 pl-3 ${
              currentFilter === 'service'
                ? 'bg-purple-50/80 ring-1 ring-purple-500/30'
                : 'hover:bg-black/[0.02]'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <Wrench className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block truncate">
                Services
              </span>
              <div className="text-[16px] font-black text-black tracking-tight leading-none mt-0.5">
                {metrics.serviceCount}
              </div>
            </div>
          </button>

          {/* Card 3: Low Stock Alerts */}
          <button
            type="button"
            onClick={() => setCurrentFilter(currentFilter === 'low_stock' ? 'all' : 'low_stock')}
            className={`p-2 rounded-xl text-left transition-all flex items-center space-x-2.5 pl-3 ${
              currentFilter === 'low_stock'
                ? 'bg-amber-50/90 ring-1 ring-amber-500/30'
                : metrics.lowStockCount > 0
                ? 'bg-amber-50/40'
                : 'hover:bg-black/[0.02]'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block truncate">
                Low Stock
              </span>
              <div
                className={`text-[16px] font-black tracking-tight leading-none mt-0.5 ${
                  metrics.lowStockCount > 0 ? 'text-amber-600' : 'text-black'
                }`}
              >
                {metrics.lowStockCount}
              </div>
            </div>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products, services, barcode..."
            className="w-full bg-[#ECECEE]/80 backdrop-blur-md rounded-full pl-10 pr-20 py-2.5 text-[14px] text-black focus:outline-none focus:ring-2 focus:ring-black/10 border border-black/[0.04] transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-semibold text-gray-600 bg-white/90 rounded-full shadow-2xs hover:bg-white transition-all"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar momentum-scroll overscroll-x-contain touch-pan-x py-0.5 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setCurrentFilter('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 whitespace-nowrap transition-all ${
              currentFilter === 'all'
                ? 'bg-white text-black shadow-xs border border-black/[0.08]'
                : 'bg-[#ECECEE]/70 text-gray-600 hover:bg-gray-200/80 border border-transparent'
            }`}
          >
            All Items ({allStockItems.length})
          </button>
          <button
            type="button"
            onClick={() => setCurrentFilter('product')}
            className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-bold shrink-0 whitespace-nowrap transition-all ${
              currentFilter === 'product'
                ? 'bg-white text-emerald-800 shadow-xs border border-emerald-300'
                : 'bg-[#ECECEE]/70 text-gray-600 hover:bg-gray-200/80 border border-transparent'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Products ({metrics.productCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentFilter('service')}
            className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-bold shrink-0 whitespace-nowrap transition-all ${
              currentFilter === 'service'
                ? 'bg-white text-purple-800 shadow-xs border border-purple-300'
                : 'bg-[#ECECEE]/70 text-gray-600 hover:bg-gray-200/80 border border-transparent'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Services ({metrics.serviceCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentFilter('low_stock')}
            className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-bold shrink-0 whitespace-nowrap transition-all ${
              currentFilter === 'low_stock'
                ? 'bg-white text-amber-800 shadow-xs border border-amber-300'
                : 'bg-[#ECECEE]/70 text-amber-700 hover:bg-gray-200/80 border border-transparent'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock ({metrics.lowStockCount})</span>
          </button>
        </div>

        {/* Stock Items List */}
        {displayedItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-black/[0.04] shadow-xs space-y-4 my-2">
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
                className="w-full sm:w-auto px-5 py-2.5 bg-black text-white rounded-full text-xs font-bold active:scale-95 shadow-sm flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Item</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
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
                  className="bg-white rounded-3xl p-3.5 sm:p-4 border border-black/[0.05] shadow-xs hover:border-black/10 active:scale-[0.99] transition-all cursor-pointer select-none space-y-3"
                >
                  {/* Top Row: Thumbnail + Info + Stepper */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div
                        className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 border ${
                          isProduct
                            ? 'bg-[#F2F2F7] text-gray-700 border-black/[0.04]'
                            : 'bg-purple-50 text-purple-600 border-purple-100'
                        }`}
                      >
                        {isProduct ? <Package className="w-6 h-6 stroke-[1.8]" /> : <Wrench className="w-6 h-6 stroke-[1.8]" />}
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
                        <span className="text-[16px] font-black text-black block tracking-tight leading-tight mt-1">
                          {formatINR(item.sellingPrice)}
                        </span>
                      </div>
                    </div>

                    {/* Stepper (Product) or Tap indicator */}
                    {isProduct && item.id ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center space-x-1 bg-[#F2F2F7] px-1 py-0.5 rounded-full border border-black/[0.04] self-center shrink-0"
                      >
                        <button
                          type="button"
                          title="Decrease stock by 1"
                          onClick={(e) => handleQuickAdjust(e, item.id!, -1)}
                          disabled={qty <= 0}
                          className="w-7 h-7 rounded-full bg-white hover:bg-gray-100 active:scale-95 disabled:opacity-30 flex items-center justify-center text-gray-700 shadow-2xs transition-all"
                        >
                          <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                        <span className="font-black text-xs text-black min-w-[26px] text-center select-none">
                          {qty}
                        </span>
                        <button
                          type="button"
                          title="Increase stock by 1"
                          onClick={(e) => handleQuickAdjust(e, item.id!, 1)}
                          className="w-7 h-7 rounded-full bg-white hover:bg-gray-100 active:scale-95 flex items-center justify-center text-gray-700 shadow-2xs transition-all"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-right shrink-0">
                        {hasCost && (
                          <span className="text-[10px] text-gray-400 block font-medium">
                            Cost: {formatINR(item.costPrice!)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Badges & Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100/90 text-[11px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {margin !== null && (
                        <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-emerald-600" />
                          <span>Profit + {formatINR(margin)}</span>
                        </span>
                      )}

                      {isProduct ? (
                        isOutOfStock ? (
                          <span className="inline-flex items-center space-x-1 text-rose-700 font-bold bg-rose-50 border border-rose-200/70 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                            <span>Out of stock</span>
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center space-x-1 text-amber-800 font-bold bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            <span>Low stock: {qty} left</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold bg-emerald-50/70 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            <span>{qty} {item.unit || 'pcs'} in stock</span>
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-purple-700 font-bold bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                          <span>Service / Labour</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 text-xs">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(item);
                        }}
                        className="text-iosBlue hover:underline flex items-center space-x-1 py-0.5 font-semibold"
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
                        className="text-iosRed hover:underline flex items-center space-x-1 py-0.5 font-semibold"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
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
          className="h-12 px-5 py-2.5 rounded-full flex items-center space-x-2 font-bold text-[14px] shadow-lg active:scale-95 transition-all duration-150 text-black bg-white/95 backdrop-blur-md border border-black/[0.08] shadow-black/10 hover:bg-white"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
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
