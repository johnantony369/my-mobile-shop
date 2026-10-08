import React, { useState } from 'react';
import { StockItem, UsedDevice, Language } from '../../../types';
import { formatINR } from '../../../i18n';
import {
  Package,
  Smartphone,
  Search,
  Plus,
  AlertTriangle
} from 'lucide-react';

interface WebStockViewProps {
  stock: StockItem[];
  usedDevices: UsedDevice[];
  language: Language;
  onAdjustQty: (id: number, delta: number) => void;
  onOpenAddStock: () => void;
  onOpenAddUsed: () => void;
  onSellUsed: (device: UsedDevice) => void;
  isReadOnly?: boolean;
}

export const WebStockView: React.FC<WebStockViewProps> = ({
  stock,
  usedDevices,
  language: _language,
  onAdjustQty,
  onOpenAddStock,
  onOpenAddUsed,
  onSellUsed,
  isReadOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'used'>('products');
  const [searchQuery, setSearchQuery] = useState('');

  // Stock calculations
  const totalStockValue = stock
    .filter((s) => s.category === 'product')
    .reduce((sum, s) => sum + (s.sellingPrice || 0) * (s.quantity || 0), 0);

  const lowStockCount = stock.filter(
    (s) =>
      s.category === 'product' &&
      (s.quantity ?? 0) <= (s.lowStockThreshold || 5)
  ).length;

  const inStockUsedCount = usedDevices.filter((d) => d.status === 'in_stock').length;

  const filteredProducts = stock.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.sku && s.sku.toLowerCase().includes(q))
    );
  });

  const filteredUsed = usedDevices.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (d.brand && d.brand.toLowerCase().includes(q)) ||
      (d.model && d.model.toLowerCase().includes(q)) ||
      (d.imei && d.imei.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Inventory Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Inventory Value</p>
            <h3 className="text-2xl font-black text-blue-600 mt-1">{formatINR(totalStockValue)}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{stock.length} catalog items</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Items</p>
            <h3 className={`text-2xl font-black mt-1 ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {lowStockCount}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Need reordering soon</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pre-Owned Gadgets</p>
            <h3 className="text-2xl font-black text-purple-600 mt-1">{inStockUsedCount}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">In stock pre-owned phones</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Sub-tab & Search Bar */}
        <div className="p-4 border-b border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'products'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Accessories & Products ({stock.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('used')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'used'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              Pre-Owned Phones ({inStockUsedCount})
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder={activeTab === 'products' ? 'Search products, SKU...' : 'Search brand, model, IMEI...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            {activeTab === 'products' ? (
              <button
                type="button"
                onClick={onOpenAddStock}
                disabled={isReadOnly}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-95 transition-all disabled:opacity-50 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAddUsed}
                disabled={isReadOnly}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs active:scale-95 transition-all disabled:opacity-50 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Intake Phone</span>
              </button>
            )}
          </div>
        </div>

        {/* Product Table */}
        {activeTab === 'products' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-5">Item Name</th>
                  <th className="py-3 px-5">Category</th>
                  <th className="py-3 px-5">SKU / Code</th>
                  <th className="py-3 px-5 text-right">Selling Price</th>
                  <th className="py-3 px-5 text-center">In Stock</th>
                  <th className="py-3 px-5 text-center">Quick Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No stock items found matching your filter.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((item) => {
                    const isLow = (item.quantity ?? 0) <= (item.lowStockThreshold || 5);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-5 font-semibold text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-3 px-5 text-xs text-slate-500">
                          <span className="capitalize px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                            {item.category || 'Product'}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-xs text-slate-400 font-mono">
                          {item.sku || '—'}
                        </td>
                        <td className="py-3 px-5 text-right font-bold text-slate-900">
                          {formatINR(item.sellingPrice || 0)}
                        </td>
                        <td className="py-3 px-5 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                              isLow
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {isLow && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                            {item.quantity ?? 0}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => item.id && onAdjustQty(item.id, -1)}
                              disabled={isReadOnly || (item.quantity ?? 0) <= 0}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center active:scale-95 transition-all disabled:opacity-40"
                              title="Decrease Quantity"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() => item.id && onAdjustQty(item.id, 1)}
                              disabled={isReadOnly}
                              className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold flex items-center justify-center active:scale-95 transition-all disabled:opacity-40"
                              title="Increase Quantity"
                            >
                              +
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Pre-Owned Phones Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-5">Device</th>
                  <th className="py-3 px-5">Identifier (IMEI / S/N)</th>
                  <th className="py-3 px-5">Purchase Cost</th>
                  <th className="py-3 px-5">Expected Sale</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredUsed.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No pre-owned devices found.
                    </td>
                  </tr>
                ) : (
                  filteredUsed.map((device) => {
                    const isSold = device.status === 'sold';
                    return (
                      <tr key={device.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-5 font-semibold text-slate-900">
                          {device.brand} {device.model}
                        </td>
                        <td className="py-3 px-5 text-xs text-slate-500 font-mono">
                          {device.imei ? `IMEI: ${device.imei}` : device.serialNumber ? `S/N: ${device.serialNumber}` : '—'}
                        </td>
                        <td className="py-3 px-5 text-xs font-semibold text-slate-600">
                          {formatINR(device.purchasePrice || 0)}
                        </td>
                        <td className="py-3 px-5 text-xs font-bold text-emerald-600">
                          {device.sellingPrice ? formatINR(device.sellingPrice) : '—'}
                        </td>
                        <td className="py-3 px-5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isSold
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-purple-100 text-purple-900 border border-purple-200'
                            }`}
                          >
                            {isSold ? 'Sold' : 'In Stock'}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-center">
                          {!isSold ? (
                            <button
                              type="button"
                              onClick={() => onSellUsed(device)}
                              disabled={isReadOnly}
                              className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs active:scale-95 transition-all disabled:opacity-50"
                            >
                              Sell Device
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">Sold: {formatINR(device.soldPrice || 0)}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
