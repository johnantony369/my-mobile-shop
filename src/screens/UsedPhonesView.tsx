import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ChevronLeft,
  Plus,
  Search,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Share2,
  Edit2,
  Trash2,
  Copy,
  Check,
  X,
} from 'lucide-react';
import { db, markUsedDeviceSold, softDeleteUsedDevice } from '../db/db';
import { UsedDevice, DeviceCategory } from '../types';
import { formatINR } from '../i18n';
import { getLocalDateString } from '../utils/date';
import { formatWhatsAppDeviceQuotation, getDeviceCategoryLabel } from '../utils/usedDevices';
import { ConfirmModal } from '../components/ConfirmModal';

export interface UsedPhonesViewProps {
  onBack?: () => void;
  shopName: string;
  shopPhone?: string;
  onOpenAdd: () => void;
  onEditDevice: (device: UsedDevice) => void;
}

export const UsedPhonesView: React.FC<UsedPhonesViewProps> = ({
  onBack,
  shopName,
  shopPhone,
  onOpenAdd,
  onEditDevice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'sold'>('in_stock');
  const [categoryFilter, setCategoryFilter] = useState<'all' | DeviceCategory>('all');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Modal states
  const [viewingKycDevice, setViewingKycDevice] = useState<UsedDevice | null>(null);
  const [sellingDevice, setSellingDevice] = useState<UsedDevice | null>(null);
  const [deviceToDelete, setDeviceToDelete] = useState<UsedDevice | null>(null);

  // Mark sold form state
  const [soldPriceStr, setSoldPriceStr] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [recordCashIn, setRecordCashIn] = useState(true);

  // Live query for used devices
  const allDevices = useLiveQuery(
    async () => {
      try {
        if (!db.usedDevices) return [];
        const items = await db.usedDevices.toArray();
        return items
          .filter((d) => !d.deletedAt && d.syncStatus !== 'deleted')
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      } catch (err) {
        console.warn('Error reading used devices:', err);
        return [];
      }
    },
    []
  ) ?? [];

  // Metrics
  const metrics = useMemo(() => {
    let inStockCount = 0;
    let soldCount = 0;
    let inStockInvestment = 0;
    let inStockExpectedValue = 0;

    for (const d of allDevices) {
      if (d.status === 'in_stock') {
        inStockCount++;
        inStockInvestment += d.purchasePrice || 0;
        inStockExpectedValue += d.sellingPrice || d.purchasePrice || 0;
      } else if (d.status === 'sold') {
        soldCount++;
      }
    }

    return {
      inStockCount,
      soldCount,
      inStockInvestment,
      inStockExpectedValue,
      projectedProfit: inStockExpectedValue - inStockInvestment,
    };
  }, [allDevices]);

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return allDevices.filter((d) => {
      // Status filter
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;

      // Category filter
      if (categoryFilter !== 'all') {
        const cat = d.deviceCategory || 'phone';
        if (cat !== categoryFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesModel = d.model.toLowerCase().includes(q);
        const matchesBrand = d.brand.toLowerCase().includes(q);
        const matchesImei = d.imei ? d.imei.includes(q) : false;
        const matchesSerial = d.serialNumber ? d.serialNumber.toLowerCase().includes(q) : false;
        const matchesSeller = d.sellerName?.toLowerCase().includes(q);
        const matchesBuyer = d.buyerName?.toLowerCase().includes(q);
        if (!matchesModel && !matchesBrand && !matchesImei && !matchesSerial && !matchesSeller && !matchesBuyer) {
          return false;
        }
      }

      return true;
    });
  }, [allDevices, statusFilter, categoryFilter, searchQuery]);

  const handleCopyIdentifier = async (d: UsedDevice) => {
    if (!d.id) return;
    const identifier = d.imei || d.serialNumber || '';
    if (!identifier) return;
    try {
      await navigator.clipboard.writeText(identifier);
      setCopiedId(d.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  };

  const handleShareWhatsApp = (d: UsedDevice) => {
    const text = formatWhatsAppDeviceQuotation(d, shopName, shopPhone);
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleOpenMarkSold = (d: UsedDevice) => {
    setSellingDevice(d);
    setSoldPriceStr(String(d.sellingPrice || d.purchasePrice || ''));
    setBuyerName('');
    setBuyerPhone('');
    setRecordCashIn(true);
  };

  const handleConfirmSold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellingDevice?.id) return;

    const soldPrice = parseFloat(soldPriceStr);
    if (isNaN(soldPrice) || soldPrice <= 0) return;

    await markUsedDeviceSold(
      sellingDevice.id,
      {
        soldPrice,
        buyerName: buyerName.trim() || undefined,
        buyerPhone: buyerPhone.trim() || undefined,
        soldDate: getLocalDateString(),
      },
      recordCashIn
    );

    setSellingDevice(null);
  };

  const handleConfirmDelete = async () => {
    if (!deviceToDelete?.id) return;
    await softDeleteUsedDevice(deviceToDelete.id);
    setDeviceToDelete(null);
  };

  return (
    <div className="min-h-screen pb-28 pt-2">
      <div className="max-w-lg mx-auto px-4 space-y-3.5">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center text-iosBlue text-[15px] font-medium active:opacity-60 -ml-1 transition-all"
            >
              <ChevronLeft className="w-5 h-5 -mr-0.5" />
              <span>Tools</span>
            </button>
          ) : (
            <span className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider block">
              {shopName || 'My Mobile Shop'}
            </span>
          )}

            <button
            type="button"
            onClick={onOpenAdd}
            className="flex items-center space-x-1.5 bg-iosBlue hover:bg-blue-600 active:scale-95 text-white text-xs font-bold px-3.5 py-2 rounded-full shadow-md shadow-iosBlue/20 transition-all select-none ml-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Intake</span>
          </button>
        </div>

        {/* Title Header */}
        <div>
          {onBack && (
            <span className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider block">
              {shopName || 'My Mobile Shop'}
            </span>
          )}
          <h1 className="text-[30px] font-extrabold text-black tracking-tight leading-tight">
            Pre-Owned Stock
          </h1>
          <p className="text-xs text-[#8E8E93] mt-0.5">
            Phones & gadgets buyback, KYC, and resale margin tracking
          </p>
        </div>

        {/* Metrics Banner */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-[14px] p-3 border border-black/[0.04] shadow-xs">
            <span className="text-[11px] font-semibold text-[#8E8E93] block">In Stock</span>
            <span className="text-[20px] font-extrabold text-iosBlue tracking-tight">
              {metrics.inStockCount}
            </span>
          </div>
          <div className="bg-white rounded-[14px] p-3 border border-black/[0.04] shadow-xs">
            <span className="text-[11px] font-semibold text-[#8E8E93] block">Invested</span>
            <span className="text-[16px] font-extrabold text-black tracking-tight block truncate mt-0.5">
              {formatINR(metrics.inStockInvestment)}
            </span>
          </div>
          <div className="bg-white rounded-[14px] p-3 border border-black/[0.04] shadow-xs">
            <span className="text-[11px] font-semibold text-[#8E8E93] block">Proj. Profit</span>
            <span className="text-[16px] font-extrabold text-emerald-600 tracking-tight block truncate mt-0.5">
              +{formatINR(metrics.projectedProfit)}
            </span>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search model, IMEI, serial number, seller..."
              className="w-full bg-[#F2F2F7] rounded-[12px] pl-9 pr-3.5 py-2.5 text-xs font-semibold text-black placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-iosBlue"
            />
          </div>

          <div className="flex space-x-1.5 bg-[#F2F2F7] p-1 rounded-[12px]">
            <button
              type="button"
              onClick={() => setStatusFilter('in_stock')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-[8px] transition-all ${
                statusFilter === 'in_stock'
                  ? 'bg-white text-iosBlue shadow-xs'
                  : 'text-[#8E8E93] hover:text-black'
              }`}
            >
              In Stock ({metrics.inStockCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('sold')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-[8px] transition-all ${
                statusFilter === 'sold'
                  ? 'bg-white text-iosBlue shadow-xs'
                  : 'text-[#8E8E93] hover:text-black'
              }`}
            >
              Sold ({metrics.soldCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-[8px] transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-iosBlue shadow-xs'
                  : 'text-[#8E8E93] hover:text-black'
              }`}
            >
              All ({allDevices.length})
            </button>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar momentum-scroll py-0.5 -mx-4 px-4 sm:mx-0 sm:px-0">
            {[
              { id: 'all', label: 'All Items' },
              { id: 'phone', label: 'Phones' },
              { id: 'laptop', label: 'Laptops' },
              { id: 'tablet', label: 'Tablets' },
              { id: 'smartwatch', label: 'Watches' },
              { id: 'earbuds', label: 'Audio' },
              { id: 'other', label: 'Other' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id as any)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold shrink-0 whitespace-nowrap transition-all ${
                  categoryFilter === cat.id
                    ? 'bg-iosBlue text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-black/[0.06] hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Device List */}
        {filteredDevices.length === 0 ? (
          <div className="bg-white rounded-[16px] p-8 text-center border border-black/[0.04] shadow-xs space-y-3 mt-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-iosBlue flex items-center justify-center mx-auto">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-black">No pre-owned stock found</h3>
              <p className="text-xs text-[#8E8E93] max-w-xs mx-auto mt-1">
                {searchQuery
                  ? 'No matching devices. Try adjusting your search query.'
                  : statusFilter === 'in_stock'
                  ? 'No pre-owned devices currently in stock. Intake a used phone or gadget from a customer to begin!'
                  : 'No devices in this list.'}
              </p>
            </div>
            {!searchQuery && (
              <button
                type="button"
                onClick={onOpenAdd}
                className="mt-2 px-4 py-2 bg-iosBlue hover:bg-blue-600 text-white rounded-full text-xs font-bold shadow-xs active:scale-95 transition-all"
              >
                + New Device Intake
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDevices.map((device) => {
              const isSold = device.status === 'sold';
              const margin = (device.sellingPrice || device.purchasePrice) - device.purchasePrice;

              return (
                <div
                  key={device.id}
                  className="bg-white rounded-[16px] p-4 border border-black/[0.05] shadow-sm space-y-3 transition-all"
                >
                  {/* Top row: Brand/Model & Status */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-bold text-iosBlue bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span>{getDeviceCategoryLabel(device.deviceCategory)}</span>
                          <span>•</span>
                          <span>{device.brand}</span>
                        </span>
                        {device.storage && (
                          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            {device.storage}
                          </span>
                        )}
                        {device.color && (
                          <span className="text-[11px] text-[#8E8E93]">
                            {device.color}
                          </span>
                        )}
                      </div>
                      <h3 className="text-[17px] font-bold text-black tracking-tight mt-1">
                        {device.model}
                      </h3>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        isSold
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isSold ? 'Sold' : 'In Stock'}
                    </span>
                  </div>

                  {/* Identifier & Copy */}
                  {(device.imei || device.serialNumber) && (
                    <div className="flex items-center justify-between bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-xs">
                      <div className="flex items-center space-x-1.5 font-mono">
                        <span className="text-[#8E8E93] text-[10px]">
                          {device.imei ? 'IMEI:' : 'S/N:'}
                        </span>
                        <span className="font-bold text-slate-800 tracking-wider">
                          {device.imei || device.serialNumber}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyIdentifier(device)}
                        className="text-xs font-semibold text-iosBlue hover:text-blue-700 active:scale-95 flex items-center space-x-1"
                      >
                        {copiedId === device.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-green-600" />
                            <span className="text-green-600 text-[11px]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Financials Breakdown */}
                  <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-black/[0.04]">
                    <div>
                      <span className="text-[#8E8E93] block text-[11px]">Cost</span>
                      <span className="font-bold text-slate-800">
                        {formatINR(device.purchasePrice)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8E8E93] block text-[11px]">
                        {isSold ? 'Sold Price' : 'Target Price'}
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatINR(isSold ? device.soldPrice || 0 : device.sellingPrice || device.purchasePrice)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8E8E93] block text-[11px]">Profit</span>
                      <span className="font-bold text-emerald-600">
                        +{formatINR(isSold ? (device.soldPrice || 0) - device.purchasePrice : margin)}
                      </span>
                    </div>
                  </div>

                  {/* Accessories / Seller KYC tag */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setViewingKycDevice(device)}
                      className="flex items-center space-x-1.5 text-xs text-iosBlue bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full font-semibold active:scale-95 transition-all"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-iosBlue" />
                      <span>KYC: {device.sellerName}</span>
                    </button>

                    {device.accessories && device.accessories.length > 0 && (
                      <span className="text-[11px] text-[#8E8E93] truncate max-w-[180px]">
                        {device.accessories.join(', ')}
                      </span>
                    )}
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#E5E5EA]">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => onEditDevice(device)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 active:scale-95 rounded-lg hover:bg-slate-100"
                        title="Edit device"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeviceToDelete(device)}
                        className="p-1.5 text-red-500 hover:text-red-700 active:scale-95 rounded-lg hover:bg-red-50"
                        title="Delete device"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleShareWhatsApp(device)}
                        className="px-3 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] font-semibold text-xs rounded-full flex items-center space-x-1 active:scale-95 transition-all"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share</span>
                      </button>

                      {!isSold && (
                        <button
                          type="button"
                          onClick={() => handleOpenMarkSold(device)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-full flex items-center space-x-1 shadow-xs active:scale-95 transition-all"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Mark Sold</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* KYC View Modal */}
      {viewingKycDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-[24px] p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-iosBlue" />
                <h3 className="text-base font-bold text-black">Seller Legal KYC Proof</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingKycDevice(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[#F2F2F7] rounded-[14px] p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#8E8E93]">Seller Name:</span>
                  <span className="font-bold text-black">{viewingKycDevice.sellerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8E8E93]">Mobile Number:</span>
                  <span className="font-bold text-black">{viewingKycDevice.sellerPhone}</span>
                </div>
                {viewingKycDevice.sellerGovtIdType && (
                  <div className="flex justify-between">
                    <span className="text-[#8E8E93]">Govt ID Type:</span>
                    <span className="font-semibold text-black">{viewingKycDevice.sellerGovtIdType}</span>
                  </div>
                )}
                {viewingKycDevice.sellerGovtIdNumber && (
                  <div className="flex justify-between">
                    <span className="text-[#8E8E93]">Govt ID Number:</span>
                    <span className="font-mono font-bold text-black">{viewingKycDevice.sellerGovtIdNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#8E8E93]">Purchase Date:</span>
                  <span className="font-semibold text-black">{viewingKycDevice.purchaseDate}</span>
                </div>
              </div>

              {/* ID Photo */}
              <div>
                <span className="font-semibold text-[#8E8E93] block mb-1">ID Snapshot Photo:</span>
                {viewingKycDevice.sellerIdPhotoUrl ? (
                  <div className="rounded-[14px] overflow-hidden border border-black/[0.08] bg-black/5 aspect-video flex items-center justify-center">
                    <img
                      src={viewingKycDevice.sellerIdPhotoUrl}
                      alt="Seller ID"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-[12px] text-center text-[#8E8E93]">
                    No ID photo was attached during intake.
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewingKycDevice(null)}
              className="w-full py-2.5 bg-[#F2F2F7] hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-[12px] transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Mark Sold Modal */}
      {sellingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <form
            onSubmit={handleConfirmSold}
            className="w-full max-w-md bg-white rounded-[24px] p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-black">
                  Mark as Sold — {sellingDevice.model}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSellingDevice(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                  Sale Price (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="100"
                  value={soldPriceStr}
                  onChange={(e) => setSoldPriceStr(e.target.value)}
                  placeholder="30000"
                  className="w-full bg-[#F2F2F7] rounded-[12px] px-3.5 py-2.5 text-black font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                  Buyer Name
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Customer Name"
                  className="w-full bg-[#F2F2F7] rounded-[12px] px-3.5 py-2 text-black text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                  Buyer Mobile
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit number"
                  className="w-full bg-[#F2F2F7] rounded-[12px] px-3.5 py-2 text-black text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <label className="flex items-center space-x-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordCashIn}
                  onChange={(e) => setRecordCashIn(e.target.checked)}
                  className="w-4 h-4 rounded-xs text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Record Cash In in Day Book automatically
                </span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSellingDevice(null)}
                className="w-full py-3 bg-[#F2F2F7] hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-[12px] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-[12px] shadow-sm transition-all"
              >
                Confirm Sold
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deviceToDelete && (
        <ConfirmModal
          isOpen={Boolean(deviceToDelete)}
          title="Delete Used Phone?"
          message={`Are you sure you want to delete ${deviceToDelete.brand} ${deviceToDelete.model} (IMEI: ${deviceToDelete.imei})? This cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          isDestructive={true}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeviceToDelete(null)}
        />
      )}
    </div>
  );
};
