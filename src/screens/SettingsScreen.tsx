import React, { useState, useRef } from 'react';
import { AppSettings, Language } from '../types';
import { t } from '../i18n';
import { updateAppSettings } from '../db/db';
import { SegmentedControl } from '../components/SegmentedControl';
import { checkCode, formatActivationCode, getTrialDaysRemaining } from '../utils/activation';
import { exportBackup, importBackup, isBackupNeeded } from '../utils/backup';
import { seedDevEntries, seedDevJobs, clearAllEntries } from '../utils/seedData';
import { ConfirmModal } from '../components/ConfirmModal';
import { useAuth } from '../firebase/useAuth';
import { loginWithGoogle } from '../firebase/auth';
import { PhoneAuthModal } from '../components/PhoneAuthModal';
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
  Wrench,
  Cloud,
  RefreshCw,
  LogOut,
  Phone,
} from 'lucide-react';

interface SettingsScreenProps {
  settings: AppSettings;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onRefreshSettings: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  language,
  onLanguageChange,
  onRefreshSettings,
}) => {
  const [shopName, setShopName] = useState(settings.shopName);
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  // Activation state
  const [activationInput, setActivationInput] = useState('');
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState(false);

  // Cloud Sync state
  const { user, isConfigured, syncState, lastSyncTime, syncError, triggerSync, signOut } = useAuth();
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Backup state
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dev state
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [devNotice, setDevNotice] = useState<string | null>(null);

  const trialDays = getTrialDaysRemaining(settings.firstLaunchDate);
  const isExpired = trialDays <= 0 && !settings.activated;
  const backupWarning = isBackupNeeded(settings.lastBackupAt);

  const handleGoogleSignIn = async () => {
    try {
      setAuthError(null);
      setGoogleLoading(true);
      await loginWithGoogle();
      onRefreshSettings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(msg || 'Google Sign-in failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSignOutConfirm = async () => {
    await signOut();
    setIsSignOutModalOpen(false);
    onRefreshSettings();
  };

  const handleSaveShopName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) return;
    await updateAppSettings({ shopName: shopName.trim() });
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2500);
    onRefreshSettings();
  };

  const handleLanguageToggle = async (val: Language) => {
    onLanguageChange(val);
    await updateAppSettings({ language: val });
    onRefreshSettings();
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatActivationCode(e.target.value);
    setActivationInput(formatted);
    setActivationError(null);
  };

  const handleActivate = async () => {
    if (checkCode(activationInput)) {
      await updateAppSettings({ activated: true });
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
    <div className="min-h-screen pb-28 pt-2">
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

        {/* Section 2: Language */}
        <div className="bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04]">
          <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-2">
            {t('section_language', language)}
          </span>
          <SegmentedControl<Language>
            value={language}
            onChange={handleLanguageToggle}
            size="md"
            options={[
              { value: 'ml', label: t('lang_malayalam', language) },
              { value: 'en', label: t('lang_english', language) },
            ]}
          />
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

          {settings.activated || activationSuccess ? (
            <div className="flex items-center space-x-2.5 p-3 bg-green-50 text-iosGreen rounded-[10px] border border-green-200">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-semibold">
                {t('activated_status', language)}
              </span>
            </div>
          ) : (
            <div className="space-y-3">
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
            </div>
          )}
        </div>

        {/* Section 4: Cloud Sync & Backup (Firebase) */}
        <div className="bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">
              <Cloud className="w-4 h-4 text-iosBlue" />
              <span>{language === 'ml' ? 'ക്ലൗഡ് ബാക്കപ്പും സമന്വയവും' : 'Cloud Sync & Backup'}</span>
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
                  ? language === 'ml' ? 'സമന്വയിപ്പിച്ചു' : 'Synced'
                  : syncState === 'syncing'
                  ? language === 'ml' ? 'സമന്വയിപ്പിക്കുന്നു...' : 'Syncing...'
                  : syncState === 'error'
                  ? language === 'ml' ? 'പിശക്' : 'Error'
                  : language === 'ml' ? 'ഓഫ്‌ലൈൻ' : 'Offline'}
              </span>
            )}
          </div>

          {!isConfigured ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-[10px] text-xs text-slate-600 leading-relaxed">
              <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>{language === 'ml' ? 'ക്ലൗഡ് ക്രമീകരണം ആവശ്യമാണ്' : 'Firebase Not Configured'}</span>
              </div>
              <p>
                {language === 'ml'
                  ? 'ക്ലൗഡ് ബാക്കപ്പ് പ്രവർത്തനക്ഷമമാക്കാൻ .env ഫയലിൽ Firebase API കീകൾ ചേർക്കുക.'
                  : 'Add your Firebase credentials to the .env file to enable automatic cloud backup.'}
              </p>
            </div>
          ) : user ? (
            <div className="space-y-3">
              <div className="p-3 bg-[#F2F2F7] rounded-[10px] flex items-center justify-between text-xs">
                <div>
                  <span className="text-[#8E8E93] block">
                    {language === 'ml' ? 'ലോഗിൻ ചെയ്ത അക്കൗണ്ട്' : 'Connected Account'}
                  </span>
                  <span className="font-semibold text-black text-sm">
                    {user.email || user.phoneNumber || user.displayName || 'Shop Owner'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSignOutModalOpen(true)}
                  className="p-1.5 text-iosRed hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{language === 'ml' ? 'ലോഗ് ഔട്ട്' : 'Sign Out'}</span>
                </button>
              </div>

              {syncError && (
                <div className="p-2.5 bg-red-50 text-iosRed text-xs rounded-lg flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{syncError}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-[#8E8E93]">
                <span>
                  {language === 'ml' ? 'അവസാനം സമന്വയിപ്പിച്ചത്:' : 'Last Synced:'}{' '}
                  <strong className="text-black font-medium">
                    {lastSyncTime ? lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (language === 'ml' ? 'ഇതുവരെയില്ല' : 'Not yet')}
                  </strong>
                </span>

                <button
                  type="button"
                  onClick={triggerSync}
                  disabled={syncState === 'syncing'}
                  className="px-3 py-1.5 bg-iosBlue/10 hover:bg-iosBlue/20 text-iosBlue font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncState === 'syncing' ? 'animate-spin' : ''}`} />
                  <span>{language === 'ml' ? 'ഇപ്പോൾ സമന്വയിക്കുക' : 'Sync Now'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[#8E8E93] leading-relaxed">
                {language === 'ml'
                  ? 'നിങ്ങളുടെ ഷോപ്പ് ഡാറ്റ ക്ലൗഡിൽ സുരക്ഷിതമായി സൂക്ഷിക്കാനും ഏത് ഫോണിൽ നിന്നും കമ്പ്യൂട്ടറിൽ നിന്നും ഉപയോഗിക്കാനും ലോഗിൻ ചെയ്യുക.'
                  : 'Sign in to automatically back up your ledger & repairs to the cloud and sync across multiple phones or computers.'}
              </p>

              {authError && (
                <div className="p-2.5 bg-red-50 text-iosRed text-xs rounded-lg flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="py-2.5 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-[10px] text-xs font-semibold flex items-center justify-center gap-2 active:scale-98 transition-all shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.41l4.03-3.13z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.59l4.03 3.13c.95-2.83 3.6-4.97 6.72-4.97z"
                    />
                  </svg>
                  <span>{googleLoading ? (language === 'ml' ? 'ലോഗിൻ ചെയ്യുന്നു...' : 'Signing in...') : 'Google'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPhoneModalOpen(true)}
                  className="py-2.5 px-3 bg-[#F2F2F7] hover:bg-slate-200 text-slate-800 rounded-[10px] text-xs font-semibold flex items-center justify-center gap-2 active:scale-98 transition-all"
                >
                  <Phone className="w-3.5 h-3.5 text-iosBlue" />
                  <span>{language === 'ml' ? 'മൊബൈൽ നമ്പർ' : 'Phone OTP'}</span>
                </button>
              </div>
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

        {/* Section 5: Developer / Testing tools */}
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
            <div className="py-1 text-center font-medium text-iosGreen">
              {t('offline_notice', language)}
            </div>
          </div>
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
        title={language === 'ml' ? 'ലോഗ് ഔട്ട് ചെയ്യണോ?' : 'Sign Out?'}
        message={
          language === 'ml'
            ? 'ലോഗ് ഔട്ട് ചെയ്താലും നിങ്ങളുടെ ഫോണിലെ വിവരങ്ങൾ സുരക്ഷിതമായിരിക്കും.'
            : 'Your local shop records will remain safely saved on this device after signing out.'
        }
        confirmLabel={language === 'ml' ? 'ലോഗ് ഔട്ട്' : 'Sign Out'}
        cancelLabel={t('cancel_action', language)}
        isDestructive={false}
        onConfirm={handleSignOutConfirm}
        onCancel={() => setIsSignOutModalOpen(false)}
      />

      {/* Phone OTP Authentication Modal */}
      <PhoneAuthModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        onSuccess={() => onRefreshSettings()}
        language={language}
      />
    </div>
  );
};
