import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { TabBar, TabType } from './components/TabBar';
import { BookScreen } from './screens/BookScreen';
import { StockScreen } from './screens/StockScreen';
import { RepairsScreen } from './screens/RepairsScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { getTrialDaysRemaining } from './utils/activation';
import { requestPersistentStorage } from './utils/storage';
import { useAuth } from './firebase/useAuth';
import { LoginModal } from './components/LoginModal';
import { InstallBanner } from './components/InstallBanner';
import { PaywallModal } from './components/PaywallModal';
import { Language } from './types';
import { pullCloudChanges } from './firebase/sync';
import { Cloud, CloudOff, RefreshCw, AlertTriangle, LogIn } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('book');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { user, loading: authLoading, isConfigured, syncState, triggerSync } = useAuth();

  useEffect(() => {
    // Request OS to keep storage persistent
    requestPersistentStorage();

    const timer = setTimeout(() => {
      setLoadingTimeout(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Safe live query for settings
  const settingsList = useLiveQuery(
    async () => {
      try {
        await db.open();
        return await db.settings.toArray();
      } catch (err) {
        console.error('Error loading settings from IndexedDB:', err);
        return [];
      }
    },
    [refreshTrigger]
  );

  // Safe live query for ready jobs count
  const readyJobsCount = useLiveQuery(
    async () => {
      try {
        if (!db.jobs) return 0;
        return await db.jobs.where('status').equals('ready').count();
      } catch (err) {
        console.warn('Error querying ready jobs count:', err);
        return 0;
      }
    },
    []
  ) ?? 0;

  // Safe live query for low stock products count
  const lowStockCount = useLiveQuery(
    async () => {
      try {
        if (!db.stock) return 0;
        const items = await db.stock.toArray();
        return items.filter(
          (i) =>
            !i.deletedAt &&
            i.syncStatus !== 'deleted' &&
            i.category === 'product' &&
            (i.quantity ?? 0) <= (i.lowStockThreshold || 5)
        ).length;
      } catch (err) {
        console.warn('Error querying low stock count:', err);
        return 0;
      }
    },
    []
  ) ?? 0;

  // Loading state with timeout fallback
  if (settingsList === undefined) {
    return (
      <div className="min-h-screen bg-iosBg flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-9 h-9 border-3 border-iosBlue border-t-transparent rounded-full animate-spin mb-4" />
        {loadingTimeout && (
          <div className="mt-4 space-y-3 animate-fade-in">
            <p className="text-xs text-[#8E8E93]">
              Taking longer than usual to load...
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-iosBlue text-white text-xs font-semibold rounded-full shadow-sm"
            >
              Reload App
            </button>
          </div>
        )}
      </div>
    );
  }

  const [checkingCloud, setCheckingCloud] = useState(false);
  const [checkedCloudUid, setCheckedCloudUid] = useState<string | null>(null);

  useEffect(() => {
    if (user && settingsList !== undefined && settingsList.length === 0 && checkedCloudUid !== user.uid) {
      setCheckingCloud(true);
      pullCloudChanges(user.uid)
        .catch(err => console.warn('Could not pull cloud changes in App:', err))
        .finally(() => {
          setCheckedCloudUid(user.uid);
          setCheckingCloud(false);
        });
    }
  }, [user, settingsList, checkedCloudUid]);

  // Show loading spinner while determining auth state or pulling cloud data for existing user
  if (authLoading || (user && settingsList?.length === 0 && (checkingCloud || checkedCloudUid !== user.uid))) {
    return (
      <div className="min-h-screen bg-iosBg flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-9 h-9 border-3 border-iosBlue border-t-transparent rounded-full animate-spin mb-4" />
      </div>
    );
  }

  // First launch / no settings: show Onboarding
  if (settingsList.length === 0) {
    return (
      <OnboardingScreen
        onComplete={() => setRefreshTrigger((prev) => prev + 1)}
      />
    );
  }

  const settings = settingsList[0];
  const language: Language = 'en';
  const showRepairs = !!settings.showRepairs;
  const trialDays = getTrialDaysRemaining(settings.firstLaunchDate);
  const isReadOnly = !settings.activated && trialDays <= 0;
  const isActivated = !!settings.activated;

  return (
    <div className="min-h-screen bg-iosBg text-iosLabel font-sans flex flex-col justify-between selection:bg-iosBlue/20">
      {/* Top Floating Cloud Sync Status Indicator */}
      {user ? (
        <button
          type="button"
          onClick={triggerSync}
          title={
            syncState === 'synced'
              ? 'Cloud Synced - Tap to refresh'
              : syncState === 'syncing'
              ? 'Syncing with cloud...'
              : syncState === 'error'
              ? 'Sync error - Tap to retry'
              : 'Offline'
          }
          className="fixed top-2.5 right-3 z-40 bg-white/85 dark:bg-slate-800/85 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm border border-black/[0.06] flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 active:scale-95 transition-all"
        >
          {syncState === 'synced' && <Cloud className="w-3.5 h-3.5 text-iosGreen" />}
          {syncState === 'syncing' && <RefreshCw className="w-3.5 h-3.5 text-iosBlue animate-spin" />}
          {syncState === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-iosRed" />}
          {syncState === 'offline' && <CloudOff className="w-3.5 h-3.5 text-slate-400" />}
          <span className="capitalize">{syncState}</span>
        </button>
      ) : isConfigured ? (
        <button
          type="button"
          onClick={() => setIsLoginModalOpen(true)}
          title="Sign in to backup and sync your shop data"
          className="fixed top-2.5 right-3 z-40 bg-white/85 dark:bg-slate-800/85 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm border border-black/[0.06] flex items-center gap-1.5 text-[11px] font-semibold text-iosBlue active:scale-95 transition-all"
        >
          <LogIn className="w-3.5 h-3.5 text-iosBlue" />
          <span>Sign In</span>
        </button>
      ) : null}

      {/* Active Screen View */}
      <main key={currentTab} className="flex-1 w-full max-w-lg mx-auto animate-fade-slide-in">
        {currentTab === 'book' && (
          <BookScreen
            language={language}
            shopName={settings.shopName}
            isReadOnly={isReadOnly}
            isActivated={isActivated}
            trialDays={trialDays}
            onOpenPaywall={() => setIsPaywallOpen(true)}
          />
        )}
        {currentTab === 'stock' && (
          <StockScreen
            language={language}
            shopName={settings.shopName}
            isReadOnly={isReadOnly}
            isActivated={isActivated}
            onOpenPaywall={() => setIsPaywallOpen(true)}
          />
        )}
        {showRepairs && currentTab === 'repairs' && (
          <RepairsScreen
            language={language}
            shopName={settings.shopName}
            isReadOnly={isReadOnly}
            isActivated={isActivated}
            trialDays={trialDays}
            onOpenPaywall={() => setIsPaywallOpen(true)}
          />
        )}
        {currentTab === 'reports' && (
          <ReportsScreen
            language={language}
            shopName={settings.shopName}
            showRepairs={showRepairs}
            isActivated={isActivated}
            onOpenPaywall={() => setIsPaywallOpen(true)}
          />
        )}
        {currentTab === 'settings' && (
          <SettingsScreen
            settings={settings}
            language={language}
            onLanguageChange={() => setRefreshTrigger((prev) => prev + 1)}
            onRefreshSettings={() => setRefreshTrigger((prev) => prev + 1)}
            onOpenPaywall={() => setIsPaywallOpen(true)}
          />
        )}
      </main>

      {/* Install Banner — shown to first-time browser visitors */}
      <InstallBanner language={language} />

      {/* Persistent Bottom Tab Bar */}
      <TabBar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        language={language}
        showRepairs={showRepairs}
        readyCount={readyJobsCount}
        lowStockCount={lowStockCount}
      />

      {/* Premium Paywall Modal */}
      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        language={language}
        onActivated={() => setRefreshTrigger((prev) => prev + 1)}
        trialDaysRemaining={trialDays}
      />

      {/* Cloud Login / Account Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
        language={language}
      />
    </div>
  );
}
