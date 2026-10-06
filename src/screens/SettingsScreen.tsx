import React, { useState, useRef } from 'react';
import { AppSettings, Language } from '../types';
import { t } from '../i18n';
import { updateAppSettings, clearLocalDatabase } from '../db/db';
import { SegmentedControl } from '../components/SegmentedControl';
import { checkCode, formatActivationCode, getTrialDaysRemaining } from '../utils/activation';
import { exportBackup, importBackup, isBackupNeeded } from '../utils/backup';
import { seedDevEntries, seedDevJobs, clearAllEntries } from '../utils/seedData';
import { ConfirmModal } from '../components/ConfirmModal';
import { useAuth } from '../firebase/useAuth';
import { LoginModal } from '../components/LoginModal';
import { usePWAInstall } from '../utils/usePWAInstall';
import {
  ShieldCheck,
  Clock,
  Download,
  Upload,
  AlertTriangle,
  Sparkles,
  Trash2,
  CheckCircle2,
  Store,
  Info,
  Package,
  Wrench,
  Cloud,
  RefreshCw,
  LogOut,
  Smartphone,
  ArrowDownToLine,
  ChevronRight,
  Crown,
  Phone,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PaywallModal } from '../components/PaywallModal';
import { isSuperAdmin, hasFullAccess } from '../utils/admin';
import {
  isProCurrentlyActive,
  isProExpired,
  proDaysRemaining,
  formatProExpiry,
  PRO_PLAN_LABELS,
} from '../utils/proPlan';
import { LegalModal } from '../components/LegalModal';
import { linkGoogleAccount } from '../firebase/auth';
import { LinkPhoneModal } from '../components/LinkPhoneModal';
import { InstallGuideModal } from '../components/InstallBanner';

/** Standalone sub-component so it has its own state without polluting SettingsScreen */
const AppUpdatesSection: React.FC<{ language: Language }> = ({ language }) => {
  const { isInstalled, canInstall, platform, triggerInstall } = usePWAInstall();
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'upToDate' | 'updating'>('idle');
  const [showGuide, setShowGuide] = useState(false);

  const handleInstallClick = async () => {
    if (canInstall) {
      await triggerInstall();
    } else {
      const triggered = await triggerInstall();
      if (!triggered) {
        setShowGuide(true);
      }
    }
  };

  const handleCheckUpdate = async () => {
    setUpdateStatus('checking');
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (!reg) {
        setUpdateStatus('upToDate');
        setTimeout(() => setUpdateStatus('idle'), 3000);
        return;
      }
      await reg.update();
      // If a new SW is waiting, the onNeedRefresh callback in main.tsx will handle the reload.
      // Otherwise, we're up to date.
      if (reg.waiting) {
        setUpdateStatus('updating');
      } else {
        setUpdateStatus('upToDate');
        setTimeout(() => setUpdateStatus('idle'), 3000);
      }
    } catch {
      setUpdateStatus('upToDate');
      setTimeout(() => setUpdateStatus('idle'), 3000);
    }
  };

  return (
    <div className="bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04]">
      <div className="flex items-center space-x-2 text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-3">
        <Smartphone className="w-4 h-4 text-iosBlue" />
        <span>{t('section_app_updates', language)}</span>
      </div>

      {/* Install row */}
      <div className="flex items-center justify-between mb-3">
        <div className="pr-3">
          <span className="text-[15px] font-semibold text-black block">
            {isInstalled
              ? t('pwa_installed_status', language)
              : t('pwa_install_btn', language)}
          </span>
          <span className="text-xs text-[#8E8E93] block mt-0.5">
            {isInstalled
              ? 'Running as a home screen app'
              : 'Add a shortcut to your home screen'}
          </span>
        </div>
        {isInstalled ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-iosGreen bg-green-50 px-2.5 py-1 rounded-full flex-shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Installed
          </span>
        ) : (
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-iosBlue hover:bg-blue-600 text-white text-xs font-bold rounded-full flex-shrink-0 active:opacity-80 transition-all shadow-xs"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            Install
          </button>
        )}
      </div>

      <div className="h-px bg-[#E5E5EA] mb-3" />

      {/* Updates row */}
      <div className="flex items-center justify-between">
        <div className="pr-3 flex-1">
          <span className="text-xs text-[#8E8E93] leading-relaxed block">
            {updateStatus === 'upToDate'
              ? t('pwa_up_to_date', language)
              : updateStatus === 'updating'
              ? t('pwa_updating', language)
              : t('pwa_updates_note', language)}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCheckUpdate}
          disabled={updateStatus === 'checking' || updateStatus === 'updating'}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F7] hover:bg-gray-200 rounded-[10px] text-xs font-semibold text-black flex-shrink-0 active:opacity-80 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${updateStatus === 'checking' ? 'animate-spin' : ''}`} />
          {t('pwa_check_update_btn', language)}
        </button>
      </div>

      {/* Guided install modal when browser doesn't support programmatic beforeinstallprompt */}
      {showGuide && (
        <InstallGuideModal
          platform={platform}
          onClose={() => setShowGuide(false)}
        />
      )}
    </div>
  );
};

interface SettingsScreenProps {
  settings: AppSettings;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onRefreshSettings: () => void;
  onOpenPaywall?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  language,
  onLanguageChange: _onLanguageChange,
  onRefreshSettings,
  onOpenPaywall,
}) => {
  const navigate = useNavigate();
  const [shopName, setShopName] = useState(settings.shopName);
  const [shopAddress, setShopAddress] = useState(settings.shopAddress || '');
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  // Paywall state
  const [isLocalPaywallOpen, setIsLocalPaywallOpen] = useState(false);
  const handleOpenPaywall = () => {
    if (onOpenPaywall) {
      onOpenPaywall();
    } else {
      setIsLocalPaywallOpen(true);
    }
  };

  // Activation state
  const [activationInput, setActivationInput] = useState('');
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState(false);

  // Cloud Sync state
  const { user, isConfigured, syncState, lastSyncTime, syncError, triggerSync, signOut, reloadUser } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [isLinkPhoneModalOpen, setIsLinkPhoneModalOpen] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [linkMsg, setLinkMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLinkGoogle = async () => {
    if (!user) return;
    setIsLinkingGoogle(true);
    setLinkMsg(null);
    try {
      await linkGoogleAccount(user);
      await reloadUser();
      setLinkMsg({ type: 'success', text: 'Google account linked successfully!' });
      setTimeout(() => setLinkMsg(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('credential-already-in-use')) {
        setLinkMsg({
          type: 'error',
          text: 'This Google account is already linked to a separate user.',
        });
      } else if (!msg.includes('popup-closed-by-user')) {
        setLinkMsg({ type: 'error', text: msg || 'Failed to link Google account' });
      }
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  // Backup state
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dev state
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [devNotice, setDevNotice] = useState<string | null>(null);

  const isAdmin = isSuperAdmin(user);
  const isProActive = hasFullAccess(isProCurrentlyActive(settings) || activationSuccess, user);
  const isPlanLapsed = !activationSuccess && isProExpired(settings);
  const planDaysLeft = proDaysRemaining(settings);
  const trialDays = getTrialDaysRemaining(settings.firstLaunchDate);
  const isExpired = trialDays <= 0 && !isProActive;
  const backupWarning = isBackupNeeded(settings.lastBackupAt);

  const handleSignOutConfirm = async () => {
    if (user) {
      await signOut();
    } else {
      await clearLocalDatabase();
    }
    setIsSignOutModalOpen(false);
    onRefreshSettings();
    window.location.reload();
  };

  const handleSaveShopName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) return;
    await updateAppSettings({
      shopName: shopName.trim(),
      shopAddress: shopAddress.trim() || undefined,
    });
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2500);
    onRefreshSettings();
  };


  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatActivationCode(e.target.value);
    setActivationInput(formatted);
    setActivationError(null);
  };

  const handleActivate = async () => {
    if (checkCode(activationInput)) {
      await updateAppSettings({ activated: true, proPlan: 'lifetime', proExpiresAt: null });
      setActivationSuccess(true);
      setActivationError(null);
      onRefreshSettings();
    } else {
      setActivationError(t('invalid_code_error', language));
    }
  };

  const handleExportBackup = async () => {
    try {
      await exportBackup();
      setBackupMsg(t('backup_export_success', language));
      onRefreshSettings();
      setTimeout(() => setBackupMsg(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await importBackup(file);
      setBackupMsg(`${t('backup_import_success', language)} (${res.count} items)`);
      onRefreshSettings();
      setTimeout(() => setBackupMsg(null), 3500);
    } catch {
      setBackupMsg(t('backup_import_error', language));
      setTimeout(() => setBackupMsg(null), 3500);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleToggleRepairs = async (val: 'off' | 'on') => {
    await updateAppSettings({ showRepairs: val === 'on' });
    onRefreshSettings();
  };

  const handleToggleStock = async (val: 'off' | 'on') => {
    await updateAppSettings({ showStock: val === 'on' });
    onRefreshSettings();
  };

  const handleSeedDev = async () => {
    const count = await seedDevEntries();
    setDevNotice(`${t('dev_seed_success', language)} (+${count})`);
    setTimeout(() => setDevNotice(null), 3000);
  };

  const handleSeedJobs = async () => {
    const count = await seedDevJobs();
    setDevNotice(`${t('dev_seed_jobs_success', language)} (+${count})`);
    setTimeout(() => setDevNotice(null), 3000);
  };

  const handleClearDev = async () => {
    await clearAllEntries();
    setIsClearModalOpen(false);
    setDevNotice(t('dev_clear_success', language));
    setTimeout(() => setDevNotice(null), 3000);
  };

  return (
    <div className="flex flex-col min-h-screen overflow-y-auto pb-28 pt-2">
      <div className="max-w-lg mx-auto px-4 space-y-4">
        {/* Large Title */}
        <h1 className="text-[32px] font-extrabold text-black tracking-tight mb-2">
          {t('settings_header', language)}
        </h1>

        {/* 30-Day Backup Alert Banner */}
        {backupWarning && (
          <div className="bg-amber-50 border border-amber-200 rounded-[14px] p-3.5 flex items-start space-x-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-amber-900 leading-relaxed font-medium">
              {t('backup_warning_30days', language)}
            </div>
          </div>
        )}

        {/* Featured Lifetime Pro Upgrade Banner */}
        {!isProActive ? (
          <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 rounded-[16px] p-4 text-white shadow-md shadow-amber-500/20 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider bg-black/20 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20">
                <img src="/icon-192.png" alt="Pro" className="w-3.5 h-3.5 rounded-xs object-cover" />
                <span>Pro Plan</span>
              </span>
              <span className="text-[11px] font-bold text-amber-100 bg-white/20 px-2.5 py-0.5 rounded-full">
                ₹99/mo • ₹999/yr
              </span>
            </div>

            <h3 className="text-[19px] font-extrabold tracking-tight leading-tight mt-1">
              {t('upgrade_to_pro', language)}
            </h3>
            <p className="text-xs text-amber-100 font-medium mt-1 leading-relaxed">
              Unlimited day book transactions, automatic cloud sync, and mobile repairs
            </p>

            <button
              type="button"
              onClick={handleOpenPaywall}
              className="mt-3.5 w-full py-3 px-4 bg-white hover:bg-amber-50 text-slate-900 rounded-[12px] font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>{t('upgrade_button', language)}</span>
              <ChevronRight className="w-4 h-4 ml-0.5 text-slate-400" />
            </button>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-[16px] p-4 text-white shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-xs overflow-hidden">
                <img src="/icon-192.png" alt="Pro" className="w-8 h-8 rounded-lg object-cover" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold tracking-tight">
                  {isAdmin ? 'Superadmin Pro Access' : t('pro_member_badge', language)}
                </h3>
                <p className="text-xs text-emerald-100">
                  {isAdmin
                    ? 'All features & admin privileges fully unlocked.'
                    : t('pro_active_desc', language)}
                </p>
              </div>
            </div>
            <CheckCircle2 className="w-6 h-6 text-white shrink-0" />
          </div>
        )}

        {/* Section 1: Shop Name */}
        <div className="bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04]">
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
            <Store className="w-4 h-4 text-iosBlue" />
            <span>{t('section_shop_info', language)}</span>
          </div>

          <form onSubmit={handleSaveShopName} className="space-y-3">
            <div>
              <label className="text-xs text-[#8E8E93] block mb-1">
                {t('onboarding_shop_name_label', language)}
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-[15px] font-medium text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
              />
            </div>

            <div>
              <label className="text-xs text-[#8E8E93] block mb-1">
                Shop Address (Appears on Bills & Invoices)
              </label>
              <textarea
                rows={2}
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                placeholder="e.g. Near Bus Stand, Main Road, Calicut"
                className="w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-[14px] font-medium text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04] resize-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="px-4 py-2 bg-iosBlue text-white text-xs font-semibold rounded-full active:opacity-80 transition-opacity"
              >
                {t('save_changes', language)}
              </button>
              {isSavedNotice && (
                <span className="text-xs text-iosGreen font-medium flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  {t('shop_name_saved', language)}
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Superadmin Control Center (Visible only to superadmin) */}
        {isSuperAdmin(user) && (
          <div className="bg-gradient-to-br from-purple-900 via-slate-900 to-indigo-950 rounded-[16px] p-4 text-white shadow-lg shadow-purple-950/20 border border-purple-500/30 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-purple-500/20 border border-purple-400/30 text-purple-200 px-2.5 py-1 rounded-full">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Superadmin Access</span>
              </span>
              <span className="text-[11px] font-mono text-purple-300">
                {user?.email}
              </span>
            </div>

            <h3 className="text-base font-bold text-white mt-1">
              Central Master Admin
            </h3>
            <p className="text-xs text-purple-200/80 mt-0.5 leading-relaxed">
              Inspect all registered shop accounts, manage cloud data usage quotas, toggle Pro activations, and contact owners.
            </p>

            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="mt-3.5 w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-[12px] font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-600/30 active:scale-[0.98] transition-all"
            >
              <Crown className="w-4 h-4 text-amber-300" />
              <span>Open Admin Dashboard</span>
              <ChevronRight className="w-4 h-4 text-purple-300 ml-auto" />
            </button>
          </div>
        )}


        {/* Section: Stock & Inventory Module Toggle */}
        <div className="bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04]">
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
            <Package className="w-4 h-4 text-iosBlue" />
            <span>Stock & Inventory</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <span className="text-[15px] font-semibold text-black block">
                Enable Stock Module
              </span>
              <span className="text-xs text-[#8E8E93] block mt-0.5">
                Manage inventory products, repair services & stock counts
              </span>
            </div>
            <div className="w-24 flex-shrink-0">
              <SegmentedControl<'off' | 'on'>
                value={settings.showStock !== false ? 'on' : 'off'}
                onChange={handleToggleStock}
                size="sm"
                options={[
                  { value: 'off', label: 'Off' },
                  { value: 'on', label: 'On' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Section: Repairs Service Module Toggle */}
        <div className="bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04]">
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
            <Wrench className="w-4 h-4 text-iosBlue" />
            <span>{t('section_repairs', language)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <span className="text-[15px] font-semibold text-black block">
                {t('enable_repairs', language)}
              </span>
              <span className="text-xs text-[#8E8E93] block mt-0.5">
                {t('enable_repairs_desc', language)}
              </span>
            </div>
            <div className="w-24 flex-shrink-0">
              <SegmentedControl<'off' | 'on'>
                value={settings.showRepairs ? 'on' : 'off'}
                onChange={handleToggleRepairs}
                size="sm"
                options={[
                  { value: 'off', label: 'Off' },
                  { value: 'on', label: 'On' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Activation */}
        <div className="bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04]">
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-iosBlue" />
            <span>{t('section_activation', language)}</span>
          </div>

          {isProActive ? (
            <div className="p-3 bg-green-50 text-iosGreen rounded-[10px] border border-green-200">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-semibold">
                  {isAdmin ? 'Activated (Superadmin Lifetime Access)' : t('activated_status', language)}
                </span>
              </div>
              {!isAdmin && settings.proPlan && (
                <p className="text-xs text-iosGreen/90 mt-1.5 ml-[30px]">
                  {PRO_PLAN_LABELS[settings.proPlan]} plan
                  {settings.proExpiresAt
                    ? ` · renews by ${formatProExpiry(settings.proExpiresAt)}${
                        planDaysLeft !== null && planDaysLeft <= 7
                          ? ` (${planDaysLeft} day${planDaysLeft === 1 ? '' : 's'} left)`
                          : ''
                      }`
                    : ' · never expires'}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {isPlanLapsed && (
                <div className="p-3 rounded-[10px] flex items-center space-x-2 bg-red-50 text-iosRed border border-red-200">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-semibold">
                    Your {settings.proPlan ? PRO_PLAN_LABELS[settings.proPlan].toLowerCase() : 'Pro'} plan expired on{' '}
                    {formatProExpiry(settings.proExpiresAt)}. Contact us to renew.
                  </span>
                </div>
              )}
              <div
                className={`p-3 rounded-[10px] flex items-center space-x-2 ${
                  isExpired
                    ? 'bg-red-50 text-iosRed border border-red-200'
                    : 'bg-blue-50 text-iosBlue border border-blue-200'
                }`}
              >
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-semibold">
                  {isExpired
                    ? t('trial_expired', language)
                    : trialDays === 1
                    ? t('trial_day_remaining', language)
                    : t('trial_days_remaining', language, { days: trialDays })}
                </span>
              </div>

              {isExpired && (
                <p className="text-xs text-iosRed leading-relaxed">
                  {t('trial_expired_banner', language)}
                </p>
              )}

              <div>
                <input
                  type="text"
                  maxLength={19}
                  value={activationInput}
                  onChange={handleCodeChange}
                  placeholder={t('activation_code_placeholder', language)}
                  className="w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-center font-mono tracking-widest text-[16px] text-black uppercase focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
                />
              </div>

              {activationError && (
                <p className="text-xs text-iosRed font-medium text-center">
                  {activationError}
                </p>
              )}

              <button
                type="button"
                onClick={handleActivate}
                className="w-full py-2.5 bg-iosBlue text-white font-semibold text-sm rounded-[10px] active:opacity-85 shadow-sm"
              >
                {t('activate_btn', language)}
              </button>

              <div className="pt-2 text-center border-t border-[#E5E5EA]">
                <button
                  type="button"
                  onClick={handleOpenPaywall}
                  className="text-xs font-semibold text-iosBlue hover:opacity-80 inline-flex items-center gap-1 active:scale-95 transition-all"
                >
                  <img src="/icon-192.png" alt="Pro" className="w-3.5 h-3.5 rounded-xs object-cover" />
                  <span>
                    Don't have a code? Get Pro (₹99/mo or ₹999/yr)
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Cloud Sync & Backup (Firebase) */}
        <div className="bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">
              <Cloud className="w-4 h-4 text-iosBlue" />
              <span>Cloud Sync & Backup</span>
            </div>
            {user && (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  syncState === 'synced'
                    ? 'bg-green-50 text-iosGreen'
                    : syncState === 'syncing'
                    ? 'bg-blue-50 text-iosBlue animate-pulse'
                    : syncState === 'error'
                    ? 'bg-red-50 text-iosRed'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    syncState === 'synced'
                      ? 'bg-iosGreen'
                      : syncState === 'syncing'
                      ? 'bg-iosBlue'
                      : syncState === 'error'
                      ? 'bg-iosRed'
                      : 'bg-gray-400'
                  }`}
                />
                {syncState === 'synced'
                  ? 'Synced'
                  : syncState === 'syncing'
                  ? 'Syncing...'
                  : syncState === 'error'
                  ? 'Error'
                  : 'Offline'}
              </span>
            )}
          </div>

          {!isConfigured ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-[10px] text-xs text-slate-600 leading-relaxed">
              <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Firebase Not Configured</span>
              </div>
              <p>
                Add your Firebase credentials to the .env file to enable automatic cloud backup.
              </p>
            </div>
          ) : user ? (
            (() => {
              const isGoogleLinked = user.providerData.some((p) => p.providerId === 'google.com');
              const isPhoneLinked = user.providerData.some((p) => p.providerId === 'phone') || !!user.phoneNumber;
              const googleEmail = user.providerData.find((p) => p.providerId === 'google.com')?.email || (isGoogleLinked ? user.email : null);
              const phoneDisplay = user.providerData.find((p) => p.providerId === 'phone')?.phoneNumber || user.phoneNumber;

              return (
                <div className="space-y-3">
                  <div className="p-3 bg-[#F2F2F7] rounded-[12px] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[#8E8E93] block font-medium">
                        Active Cloud Session
                      </span>
                      <span className="font-bold text-black text-sm truncate max-w-[200px] block">
                        {user.email || user.phoneNumber || user.displayName || 'Shop Owner'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSignOutModalOpen(true)}
                      className="px-2.5 py-1.5 text-iosRed bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>

                  {/* Linked Login Methods (Google & Phone) */}
                  <div className="p-3 bg-white rounded-[12px] border border-black/[0.06] space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-800 uppercase tracking-wider text-[10px]">
                        Linked Sign-In Methods
                      </span>
                      <span className="text-[10px] text-gray-500">
                        Use either to access same shop
                      </span>
                    </div>

                    {linkMsg && (
                      <div className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                        linkMsg.type === 'success' ? 'bg-green-50 text-iosGreen' : 'bg-red-50 text-iosRed'
                      }`}>
                        {linkMsg.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                        <span>{linkMsg.text}</span>
                      </div>
                    )}

                    {/* Google Provider Row */}
                    <div className="flex items-center justify-between py-1 border-b border-gray-100/80">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <div>
                          <span className="text-xs font-semibold text-black block">Google Account</span>
                          <span className="text-[11px] text-gray-500 block truncate max-w-[170px]">
                            {isGoogleLinked ? googleEmail || 'Connected' : 'Not linked'}
                          </span>
                        </div>
                      </div>

                      {isGoogleLinked ? (
                        <span className="text-[11px] font-semibold text-iosGreen bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Linked
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleLinkGoogle}
                          disabled={isLinkingGoogle}
                          className="px-2.5 py-1 text-xs font-semibold text-iosBlue bg-blue-50 hover:bg-blue-100 rounded-lg active:scale-95 transition-all"
                        >
                          {isLinkingGoogle ? 'Linking...' : '+ Link Google'}
                        </button>
                      )}
                    </div>

                    {/* Phone Number Provider Row */}
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                          <Phone className="w-2.5 h-2.5" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-black block">Phone Number (OTP)</span>
                          <span className="text-[11px] text-gray-500 block">
                            {isPhoneLinked ? phoneDisplay || 'Connected' : 'Not linked'}
                          </span>
                        </div>
                      </div>

                      {isPhoneLinked ? (
                        <span className="text-[11px] font-semibold text-iosGreen bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Linked
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsLinkPhoneModalOpen(true)}
                          className="px-2.5 py-1 text-xs font-semibold text-iosBlue bg-blue-50 hover:bg-blue-100 rounded-lg active:scale-95 transition-all"
                        >
                          + Link Phone
                        </button>
                      )}
                    </div>
                  </div>

                  {syncError && (
                    <div className="p-2.5 bg-red-50 text-iosRed text-xs rounded-lg flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{syncError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-[#8E8E93]">
                    <span>
                      Last Synced:{' '}
                      <strong className="text-black font-medium">
                        {lastSyncTime ? lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not yet'}
                      </strong>
                    </span>

                    <button
                      type="button"
                      onClick={triggerSync}
                      disabled={syncState === 'syncing'}
                      className="px-3 py-1.5 bg-iosBlue/10 hover:bg-iosBlue/20 text-iosBlue font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncState === 'syncing' ? 'animate-spin' : ''}`} />
                      <span>Sync Now</span>
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[#8E8E93] leading-relaxed">
                Sign in to automatically back up your ledger & repairs to the cloud and sync across multiple phones or computers.
              </p>

              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-all shadow-md shadow-blue-500/20"
              >
                <Store className="w-4 h-4" />
                <span>Sign In / Cloud Account</span>
              </button>
            </div>
          )}
        </div>

        {/* Section 5: Local Backup & Restore */}
        <div className="bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04]">
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
            <Download className="w-4 h-4 text-iosBlue" />
            <span>{t('section_backup', language)}</span>
          </div>

          <div className="text-xs text-[#8E8E93] mb-3">
            <span>{t('last_backup_label', language)} </span>
            <strong className="text-black font-medium">
              {settings.lastBackupAt
                ? new Date(settings.lastBackupAt).toLocaleDateString()
                : t('never_backed_up', language)}
            </strong>
          </div>

          {backupMsg && (
            <div className="mb-3 p-2 bg-blue-50 text-iosBlue text-xs rounded-lg text-center font-medium">
              {backupMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleExportBackup}
              className="py-2.5 px-3 bg-[#F2F2F7] hover:bg-gray-200 rounded-[10px] text-xs font-semibold text-black flex items-center justify-center space-x-1.5 active:scale-98 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('backup_export_btn', language)}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 bg-[#F2F2F7] hover:bg-gray-200 rounded-[10px] text-xs font-semibold text-black flex items-center justify-center space-x-1.5 active:scale-98 transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t('backup_import_btn', language)}</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>

        {/* Section 5: Developer / Testing tools (Superadmin only) */}
        {isSuperAdmin(user) && (
          <div className="bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04]">
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{t('dev_section', language)}</span>
            </div>

            {devNotice && (
              <div className="mb-2.5 p-2 bg-green-50 text-iosGreen text-xs rounded-lg text-center font-medium">
                {devNotice}
              </div>
            )}

            <div className="flex flex-col space-y-2">
              <button
                type="button"
                onClick={handleSeedDev}
                className="py-2 px-3 bg-blue-50 hover:bg-blue-100 rounded-[10px] text-xs font-semibold text-iosBlue flex items-center justify-center space-x-1.5 active:opacity-80 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('dev_seed_btn', language)}</span>
              </button>

              {settings.showRepairs && (
                <button
                  type="button"
                  onClick={handleSeedJobs}
                  className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 rounded-[10px] text-xs font-semibold text-indigo-600 flex items-center justify-center space-x-1.5 active:opacity-80 transition-colors"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>{t('dev_seed_jobs_btn', language)}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsClearModalOpen(true)}
                className="py-2 px-3 bg-red-50 hover:bg-red-100 rounded-[10px] text-xs font-semibold text-iosRed flex items-center justify-center space-x-1.5 active:opacity-80 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('dev_clear_btn', language)}</span>
              </button>
            </div>
          </div>
        )}

        {/* Section: App & Updates */}
        <AppUpdatesSection language={language} />

        {/* Section 6: About */}
        <div className="bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04]">
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
            <Info className="w-4 h-4 text-iosBlue" />
            <span>{t('section_about', language)}</span>
          </div>

          <div className="space-y-1.5 text-xs text-[#8E8E93]">
            <div className="flex justify-between py-1 border-b border-[#E5E5EA]">
              <span>App Name</span>
              <strong className="text-black font-semibold">{t('app_name', language)}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E5E5EA]">
              <span>{t('app_version_label', language)}</span>
              <strong className="text-black font-semibold">1.0.0</strong>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-[#E5E5EA]">
              <span>Public Website</span>
              <a
                href="/"
                className="text-xs font-semibold text-iosBlue hover:underline"
              >
                mymobileshop.online
              </a>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-[#E5E5EA]">
              <span>Legal & Policies</span>
              <button
                type="button"
                onClick={() => setIsLegalModalOpen(true)}
                className="text-xs font-semibold text-iosBlue hover:underline"
              >
                Privacy Policy & Terms
              </button>
            </div>
            <div className="py-1 text-center font-medium text-iosGreen">
              {t('offline_notice', language)}
            </div>
          </div>
        </div>


        {/* Section 7: Log Out / Switch Shop Button (iOS Grouped Style) */}
        <div className="bg-white rounded-[14px] p-2 shadow-sm border border-black/[0.04]">
          <button
            type="button"
            onClick={() => setIsSignOutModalOpen(true)}
            className="w-full py-3.5 px-4 flex items-center justify-center space-x-2 text-iosRed font-semibold text-[15px] rounded-[10px] hover:bg-red-50/60 active:bg-red-100/50 transition-colors"
          >
            <LogOut className="w-4 h-4 text-iosRed" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        title={t('dev_clear_btn', language)}
        message={t('dev_clear_confirm', language)}
        confirmLabel={t('delete_action', language)}
        cancelLabel={t('cancel_action', language)}
        isDestructive={true}
        onConfirm={handleClearDev}
        onCancel={() => setIsClearModalOpen(false)}
      />

      {/* Sign Out Confirmation Modal */}
      <ConfirmModal
        isOpen={isSignOutModalOpen}
        title="Sign Out?"
        message="Your shop records are safely backed up to your cloud account. Signing out will clear local data on this device so another account can sign in securely."
        confirmLabel="Sign Out"
        cancelLabel={t('cancel_action', language)}
        isDestructive={false}
        onConfirm={handleSignOutConfirm}
        onCancel={() => setIsSignOutModalOpen(false)}
      />

      {/* Unified Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => onRefreshSettings()}
        language={language}
      />

      {/* Paywall Bottom Sheet */}
      <PaywallModal
        isOpen={isLocalPaywallOpen}
        onClose={() => setIsLocalPaywallOpen(false)}
        language={language}
        onActivated={onRefreshSettings}
        trialDaysRemaining={trialDays}
      />

      {/* Legal & Privacy Modal */}
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
      />

      {/* Link Phone Number Modal */}
      {user && (
        <LinkPhoneModal
          isOpen={isLinkPhoneModalOpen}
          onClose={() => setIsLinkPhoneModalOpen(false)}
          onSuccess={async () => {
            await reloadUser();
            setLinkMsg({ type: 'success', text: 'Phone number linked successfully!' });
            setTimeout(() => setLinkMsg(null), 3500);
          }}
          user={user}
        />
      )}
    </div>
  );
};
