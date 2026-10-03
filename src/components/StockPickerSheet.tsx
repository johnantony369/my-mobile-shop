import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BottomSheet } from './BottomSheet';
import { StockItem, Language } from '../types';
import { db } from '../db/db';
import { formatINR } from '../i18n';
import { Search, Package, Wrench, Plus, AlertCircle, X } from 'lucide-react';
import { AddEditStockSheet } from '../screens/AddEditStockSheet';

interface StockPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: StockItem) => void;
  title?: string;
  defaultFilter?: 'all' | 'product' | 'service';
  language: Language;
}

export const StockPickerSheet: React.FC<StockPickerSheetProps> = ({
  isOpen,
  onClose,
  onSelect,
  title = 'Select Product or Service',
  defaultFilter = 'all',
  language,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'product' | 'service'>(defaultFilter);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Live query for active stock items
  const allStock = useLiveQuery(
    async () => {
      try {
        if (!db.stock) return [];
        const items = await db.stock.toArray();
        return items.filter((item) => !item.deletedAt && item.syncStatus !== 'deleted');
      } catch (err) {
        console.warn('Error querying stock in picker:', err);
        return [];
      }
    },
    []
  ) ?? [];

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setFilter(defaultFilter);
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, defaultFilter]);

  // Filtered and searched stock items
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allStock.filter((item) => {
      // Category filter
      if (filter !== 'all' && item.category !== filter) return false;

      // Query filter
      if (!q) return true;
      const matchName = item.name.toLowerCase().includes(q);
      const matchSku = item.sku ? item.sku.toLowerCase().includes(q) : false;
      const matchNotes = item.notes ? item.notes.toLowerCase().includes(q) : false;
      return matchName || matchSku || matchNotes;
    });
  }, [allStock, search, filter]);

  const productCount = allStock.filter((i) => i.category === 'product').length;
  const serviceCount = allStock.filter((i) => i.category === 'service').length;

  const handleItemClick = (item: StockItem) => {
    onSelect(item);
    onClose();
  };

  const handleStockCreated = (newItem: StockItem) => {
    setIsAddStockOpen(false);
    onSelect(newItem);
    onClose();
  };

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
        <div className="space-y-3 pt-1">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product, service, or barcode..."
              className="w-full bg-[#F2F2F7] rounded-[10px] pl-9.5 pr-8 py-2.5 text-[14px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Category Filter Pills */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar momentum-scroll overscroll-x-contain touch-pan-x py-0.5">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  filter === 'all'
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-[#F2F2F7] text-gray-600 hover:bg-gray-200/80'
                }`}
              >
                All ({allStock.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('product')}
                className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  filter === 'product'
                    ? 'bg-iosBlue text-white shadow-xs'
                    : 'bg-[#F2F2F7] text-gray-600 hover:bg-gray-200/80'
                }`}
              >
                <Package className="w-3 h-3" />
                <span>Products ({productCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilter('service')}
                className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  filter === 'service'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-[#F2F2F7] text-gray-600 hover:bg-gray-200/80'
                }`}
              >
                <Wrench className="w-3 h-3" />
                <span>Services ({serviceCount})</span>
              </button>
            </div>

            {/* Quick add button */}
            <button
              type="button"
              onClick={() => setIsAddStockOpen(true)}
              className="flex items-center space-x-1 text-iosBlue text-xs font-semibold active:opacity-75 py-1 px-2 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add New</span>
            </button>
          </div>

          {/* Items list */}
          <div className="max-h-[50vh] overflow-y-auto space-y-1.5 pr-0.5 -mr-0.5 divide-y divide-gray-100">
            {filteredItems.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                  <Search className="w-5 h-5" />
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  {search ? `No items found matching "${search}"` : 'No stock items added yet'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddStockOpen(true)}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-iosBlue text-white rounded-full text-xs font-semibold active:scale-95 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add "{search || 'Item'}" to Stock</span>
                </button>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isProduct = item.category === 'product';
                const qty = item.quantity ?? 0;
                const threshold = item.lowStockThreshold || 5;
                const isOutOfStock = isProduct && qty <= 0;
                const isLowStock = isProduct && qty > 0 && qty <= threshold;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className="w-full text-left py-2.5 px-2 rounded-[10px] hover:bg-gray-50 active:bg-[#F2F2F7] transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-3 min-w-0 pr-2">
                      <div
                        className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${
                          isProduct
                            ? 'bg-blue-50 text-iosBlue'
                            : 'bg-purple-50 text-purple-600'
                        }`}
                      >
                        {isProduct ? <Package className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="font-semibold text-[14px] text-black truncate group-hover:text-iosBlue transition-colors">
                          {item.name}
                        </div>
                        <div className="flex items-center space-x-1.5 text-[11px] text-gray-500 mt-0.5">
                          {isProduct ? (
                            isOutOfStock ? (
                              <span className="text-iosRed font-medium bg-red-50 px-1.5 py-0.2 rounded">
                                Out of stock
                              </span>
                            ) : isLowStock ? (
                              <span className="text-amber-600 font-medium bg-amber-50 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                <AlertCircle className="w-2.5 h-2.5" /> Low ({qty} left)
                              </span>
                            ) : (
                              <span className="text-iosGreen font-medium bg-emerald-50 px-1.5 py-0.2 rounded">
                                {qty} in stock
                              </span>
                            )
                          ) : (
                            <span className="text-purple-700 font-medium bg-purple-50 px-1.5 py-0.2 rounded">
                              Service / Labour
                            </span>
                          )}

                          {item.sku && (
                            <span className="font-mono text-gray-400 text-[10px]">
                              • {item.sku}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[15px] font-bold text-black block">
                        ₹{formatINR(item.sellingPrice)}
                      </span>
                      <span className="text-[10px] text-iosBlue font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Tap to select →
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Embedded Add Stock Item sheet for on-the-fly stock creation */}
      {isAddStockOpen && (
        <AddEditStockSheet
          isOpen={isAddStockOpen}
          onClose={() => setIsAddStockOpen(false)}
          onSaved={handleStockCreated}
          itemToEdit={null}
          language={language}
          defaultCategory={filter === 'service' ? 'service' : 'product'}
        />
      )}
    </>
  );
};
