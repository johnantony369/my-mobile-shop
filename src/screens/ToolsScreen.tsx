import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Smartphone,
  Calculator,
  ShieldAlert,
  Plus,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  MessageSquare,
  ClipboardList,
} from 'lucide-react';
import { db } from '../db/db';
import { Language, UsedDevice } from '../types';
import { formatINR } from '../i18n';
import { UsedPhonesView } from './UsedPhonesView';
import { AddEditUsedPhoneSheet } from './AddEditUsedPhoneSheet';
import { PurchaseListView } from '../components/PurchaseListView';
import { EMICalculatorModal } from '../components/tools/EMICalculatorModal';
import { WhatsAppBroadcastModal } from '../components/tools/WhatsAppBroadcastModal';
import { CEIRCheckModal } from '../components/tools/CEIRCheckModal';

export interface ToolsScreenProps {
  language: Language;
  shopName: string;
  shopPhone?: string;
  shopAddress?: string;
  isReadOnly?: boolean;
  isActivated?: boolean;
  onOpenPaywall?: () => void;
}

export const ToolsScreen: React.FC<ToolsScreenProps> = ({
  language: _language,
  shopName,
  shopPhone,
  shopAddress,
  isReadOnly: _isReadOnly,
  isActivated: _isActivated,
  onOpenPaywall: _onOpenPaywall,
}) => {
  const [currentView, setCurrentView] = useState<'grid' | 'used_phones' | 'purchase_list'>('grid');

  // Modal states
  const [isAddIntakeOpen, setIsAddIntakeOpen] = useState(false);
  const [isEmiOpen, setIsEmiOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isCeirOpen, setIsCeirOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<UsedDevice | null>(null);

  // Live query for used devices
  const allUsedDevices = useLiveQuery(
    async () => {
      try {
        if (!db.usedDevices) return [];
        const items = await db.usedDevices.toArray();
        return items.filter((d) => !d.deletedAt && d.syncStatus !== 'deleted');
      } catch (err) {
        console.warn('Error reading used devices in ToolsScreen:', err);
        return [];
      }
    },
    []
  ) ?? [];

  // Metrics
  const { inStockCount, inStockValue } = useMemo(() => {
    let count = 0;
    let value = 0;
    for (const d of allUsedDevices) {
      if (d.status === 'in_stock') {
        count++;
        value += d.sellingPrice || d.purchasePrice || 0;
      }
    }
    return { inStockCount: count, inStockValue: value };
  }, [allUsedDevices]);

  const pendingPurchaseCount =
    useLiveQuery(() => db.purchases.filter((p) => !p.isPurchased).count(), []) ?? 0;

  const handleEditDeviceFromView = (device: UsedDevice) => {
    setEditingDevice(device);
    setIsAddIntakeOpen(true);
  };

  // If viewing the full Used Phones Hub
  if (currentView === 'used_phones') {
    return (
      <>
        <UsedPhonesView
          onBack={() => setCurrentView('grid')}
          shopName={shopName}
          shopPhone={shopPhone}
          onOpenAdd={() => {
            setEditingDevice(null);
            setIsAddIntakeOpen(true);
          }}
          onEditDevice={handleEditDeviceFromView}
        />

        <AddEditUsedPhoneSheet
          isOpen={isAddIntakeOpen}
          onClose={() => {
            setIsAddIntakeOpen(false);
            setEditingDevice(null);
          }}
          deviceToEdit={editingDevice}
          shopName={shopName}
        />
      </>
    );
  }

  // If viewing the Purchase List
  if (currentView === 'purchase_list') {
    return (
      <div className="min-h-screen pb-28 pt-2">
        <div className="max-w-lg mx-auto px-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentView('grid')}
              className="flex items-center text-iosBlue text-[15px] font-medium active:opacity-60 -ml-1 transition-all"
            >
              <ChevronLeft className="w-5 h-5 -mr-0.5" />
              <span>Tools</span>
            </button>
            <span className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">
              Purchase List
            </span>
          </div>
          <PurchaseListView isReadOnly={_isReadOnly} onOpenPaywall={_onOpenPaywall} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 pt-2">
      <div className="max-w-lg mx-auto px-4 space-y-4">
        {/* Header */}
        <div className="pt-1">
          <span className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider block">
            {shopName || 'My Mobile Shop'}
          </span>
          <h1 className="text-[32px] font-extrabold text-black tracking-tight leading-tight">
            Shop Tools
          </h1>
          <p className="text-xs text-[#8E8E93] mt-0.5">
            Mobile retail power tools & utilities
          </p>
        </div>

        {/* ========================================================
            CONCEPT 4: APPLE iOS BENTO GRID DASHBOARD
           ======================================================== */}
        <div className="space-y-3">
          {/* 1. HERO BENTO CARD: PRE-OWNED PHONE HUB (Full Width) */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[22px] p-5 text-white shadow-lg active:scale-[0.99] transition-all border border-slate-700/50">
            {/* Background decorative subtle glow */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-3.5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                      Flagship Tool
                    </span>
                    <span className="text-[10px] bg-white/15 text-white px-2 py-0.5 rounded-full font-bold">
                      KYC Verified
                    </span>
                  </div>
                  <h2 className="text-[22px] font-extrabold tracking-tight mt-1 leading-tight">
                    Pre-Owned Stock Hub
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-[240px] mt-0.5">
                    Serialized intake, IMEI/Serial check, Seller ID proof & WhatsApp transfer declaration.
                  </p>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Live Status Badges */}
              <div className="flex items-center space-x-2 pt-1">
                <span className="bg-white/20 backdrop-blur-xs text-white text-xs font-bold px-3 py-1 rounded-full">
                  {inStockCount} {inStockCount === 1 ? 'in Stock' : 'in Stock'}
                </span>
                {inStockValue > 0 && (
                  <span className="bg-slate-700/70 text-slate-200 text-xs font-medium px-2.5 py-1 rounded-full border border-white/10">
                    {formatINR(inStockValue)} Value
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditingDevice(null);
                    setIsAddIntakeOpen(true);
                  }}
                  className="w-full py-2.5 bg-iosBlue hover:bg-blue-600 active:scale-95 text-white text-xs font-bold rounded-[12px] shadow-sm flex items-center justify-center space-x-1.5 transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>+ New Intake</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentView('used_phones')}
                  className="w-full py-2.5 bg-white/15 hover:bg-white/25 border border-white/20 active:scale-95 text-white text-xs font-bold rounded-[12px] flex items-center justify-center space-x-1 transition-all"
                >
                  <span>Manage Stock</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 2. PURCHASE & REORDER LIST BENTO CARD (Moved from Stock tab) */}
          <div
            onClick={() => setCurrentView('purchase_list')}
            className="bg-white rounded-[20px] p-4 border border-black/[0.04] shadow-sm hover:shadow-md active:scale-99 transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-iosBlue flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-[15px] font-bold text-black tracking-tight">
                    Purchase & Reorder List
                  </h3>
                  {pendingPurchaseCount > 0 ? (
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                      {pendingPurchaseCount} items to buy
                    </span>
                  ) : (
                    <span className="text-[10px] bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full">
                      Up to date
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#8E8E93] mt-0.5">
                  Checklist of items, parts & accessories to purchase from market.
                </p>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
          </div>

          {/* 3. MIDDLE ROW: 2 ASYMMETRIC / SQUARE BENTO CARDS */}
          <div className="grid grid-cols-2 gap-3">
            {/* Middle Left: WhatsApp Story & Stock Broadcast */}
            <div
              onClick={() => setIsBroadcastOpen(true)}
              className="bg-white rounded-[20px] p-4 border border-black/[0.04] shadow-sm hover:shadow-md active:scale-98 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-green-50 text-[#25D366] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-black tracking-tight leading-snug">
                    WhatsApp Broadcast
                  </h3>
                  <p className="text-[11px] text-[#8E8E93] leading-relaxed mt-0.5">
                    1-Tap export active used stock to WhatsApp customers.
                  </p>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs font-bold text-[#128C7E]">
                <span>{inStockCount} Phones Ready</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Middle Right: Customer EMI & Loan Calculator */}
            <div
              onClick={() => setIsEmiOpen(true)}
              className="bg-white rounded-[20px] p-4 border border-black/[0.04] shadow-sm hover:shadow-md active:scale-98 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-black tracking-tight leading-snug">
                    EMI Calculator
                  </h3>
                  <p className="text-[11px] text-[#8E8E93] leading-relaxed mt-0.5">
                    Phone installments, interest & loan quotes.
                  </p>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs font-bold text-emerald-600">
                <span>Interactive Quote</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>

          {/* 4. BOTTOM BENTO CARD: CEIR STOLEN DEVICE CHECK */}
          <div
            onClick={() => setIsCeirOpen(true)}
            className="bg-white rounded-[20px] p-4 border border-black/[0.04] shadow-sm hover:shadow-md active:scale-99 transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-[15px] font-bold text-black tracking-tight">
                    CEIR Stolen Device Check
                  </h3>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                    Official
                  </span>
                </div>
                <p className="text-xs text-[#8E8E93] mt-0.5">
                  Verify 15-digit IMEI on Government portal to avoid police disputes.
                </p>
              </div>
            </div>

            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-amber-600 shrink-0 ml-2" />
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddEditUsedPhoneSheet
        isOpen={isAddIntakeOpen}
        onClose={() => {
          setIsAddIntakeOpen(false);
          setEditingDevice(null);
        }}
        deviceToEdit={editingDevice}
        shopName={shopName}
      />

      <EMICalculatorModal
        isOpen={isEmiOpen}
        onClose={() => setIsEmiOpen(false)}
        shopName={shopName}
      />

      <WhatsAppBroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        devices={allUsedDevices}
        shopName={shopName}
        shopPhone={shopPhone}
        shopAddress={shopAddress}
      />

      <CEIRCheckModal
        isOpen={isCeirOpen}
        onClose={() => setIsCeirOpen(false)}
      />
    </div>
  );
};
