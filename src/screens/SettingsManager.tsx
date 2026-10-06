import React, { useState } from 'react';
import { AppSettings } from '../types';
import { updateAppSettings, clearLocalDatabase } from '../db/db';
import { useAuth } from '../firebase/useAuth';
import { Card } from '../components/iOSComponents';
import { exportBackup } from '../utils/backup';
import {
  LogOut,
  RefreshCw,
  Download,
  CheckCircle2,
} from 'lucide-react';

interface SettingsManagerProps {
  settings: AppSettings;
  onRefreshSettings: () => void;
  onOpenPaywall: () => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  settings,
  onRefreshSettings,
  onOpenPaywall,
}) => {
  const [salonName, setSalonName] = useState(settings.shopName || '');
  const [ownerName, setOwnerName] = useState(settings.ownerName || '');
  const [ownerPhone, setOwnerPhone] = useState(settings.ownerPhone || '');
  const [address, setAddress] = useState(settings.address || '');
  const [businessHours, setBusinessHours] = useState(settings.businessHours || '9:30 AM - 7:30 PM');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const { user, signOut, syncState, triggerSync } = useAuth();

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateAppSettings({
      shopName: salonName.trim() || 'MySalon',
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      address: address.trim(),
      businessHours: businessHours.trim(),
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    onRefreshSettings();
  };

  const handleExport = async () => {
    await exportBackup();
  };

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to log out? Local data will be preserved securely.')) {
      if (user) {
        await signOut();
      } else {
        await clearLocalDatabase();
      }
      window.location.reload();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[20px] font-extrabold text-[#171717] tracking-tight">Settings</h2>
        <p className="text-[12px] text-[#8E8E93]">Salon profile, sync & subscription</p>
      </div>

      {/* Subscription Card */}
      <Card className="p-4 bg-gradient-to-br from-[#171717] to-[#2C2C2E] text-white space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black tracking-wider uppercase bg-white/20 px-2 py-0.5 rounded-full">
            {settings.activated ? 'Pro Active' : 'Free Trial'}
          </span>
          <span className="text-xs font-semibold text-gray-300">
            {settings.activated ? '₹199 / mo' : '14 Days Trial'}
          </span>
        </div>
        <h3 className="text-[17px] font-black">
          {settings.activated ? 'MySalon Pro Member' : 'Upgrade to MySalon Pro'}
        </h3>
        <p className="text-[12px] text-gray-300">
          Unlimited appointments, customer histories, cloud sync & reports.
        </p>
        {!settings.activated && (
          <button
            type="button"
            onClick={onOpenPaywall}
            className="w-full mt-1 py-2.5 bg-white text-[#171717] rounded-[12px] text-[13px] font-bold shadow-xs active:scale-95 transition-all"
          >
            Upgrade Now • ₹199/month
          </button>
        )}
      </Card>

      {/* Salon Profile Form */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider">
            Salon Profile
          </span>
          {savedSuccess && (
            <span className="text-[11px] font-bold text-[#34C759] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved
            </span>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div>
            <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
              Salon Name
            </label>
            <input
              type="text"
              value={salonName}
              onChange={(e) => setSalonName(e.target.value)}
              className="w-full bg-[#F6F5F3] rounded-[10px] px-3 py-2 text-[14px] text-[#171717] border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-[#171717]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
                Owner Name
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Owner name"
                className="w-full bg-[#F6F5F3] rounded-[10px] px-3 py-2 text-[14px] text-[#171717] border border-black/[0.04] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
                Phone
              </label>
              <input
                type="text"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="10-digit phone"
                className="w-full bg-[#F6F5F3] rounded-[10px] px-3 py-2 text-[14px] text-[#171717] border border-black/[0.04] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
              Address / Town
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. MG Road, Kochi"
              className="w-full bg-[#F6F5F3] rounded-[10px] px-3 py-2 text-[14px] text-[#171717] border border-black/[0.04] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
              Business Hours
            </label>
            <input
              type="text"
              value={businessHours}
              onChange={(e) => setBusinessHours(e.target.value)}
              placeholder="e.g. 9:30 AM - 8:00 PM"
              className="w-full bg-[#F6F5F3] rounded-[10px] px-3 py-2 text-[14px] text-[#171717] border border-black/[0.04] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-[#171717] hover:bg-[#2C2C2E] active:scale-95 text-white rounded-[12px] text-[13px] font-bold shadow-xs transition-all"
          >
            Save Profile
          </button>
        </form>
      </Card>

      {/* Cloud Backup & Sync */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider">
            Cloud Backup & Sync
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              syncState === 'synced'
                ? 'bg-[#EBF7EE] text-[#1E7E34]'
                : syncState === 'syncing'
                ? 'bg-blue-50 text-blue-600 animate-pulse'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {syncState === 'synced' ? 'Live Synced' : syncState === 'syncing' ? 'Syncing...' : 'Ready'}
          </span>
        </div>

        <p className="text-[12px] text-[#6B6B6B]">
          {user ? `Connected as ${user.email || user.phoneNumber || 'Salon Owner'}` : 'Offline-first storage'}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={triggerSync}
            className="py-2.5 bg-[#F6F5F3] hover:bg-gray-200 text-[#171717] rounded-[12px] text-[12px] font-bold flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Now</span>
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="py-2.5 bg-[#F6F5F3] hover:bg-gray-200 text-[#171717] rounded-[12px] text-[12px] font-bold flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Backup</span>
          </button>
        </div>
      </Card>

      {/* Account & Logout */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full py-3 bg-red-50 hover:bg-red-100 active:scale-95 text-[#D32F2F] rounded-[14px] text-[13px] font-bold flex items-center justify-center gap-2 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out / Switch Account</span>
        </button>
      </div>
    </div>
  );
};
