import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, updateAppSettings, clearLocalDatabase } from './db/db';
import { TabBar, TabType } from './components/TabBar';
import { BookScreen } from './screens/BookScreen';
import { StockScreen } from './screens/StockScreen';
import { RepairsScreen } from './screens/RepairsScreen';
import { ToolsScreen } from './screens/ToolsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SparesScreen } from './screens/wholesale/SparesScreen';
import { ClientsScreen } from './screens/wholesale/ClientsScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { getTrialDaysRemaining } from './utils/activation';
import { isSuperAdmin, hasFullAccess } from './utils/admin';
import { isProCurrentlyActive } from './utils/proPlan';
import { requestPersistentStorage } from './utils/storage';
import { useAuth } from './firebase/useAuth';
import { LoginModal } from './components/LoginModal';
import { InstallBanner } from './components/InstallBanner';
import { PaywallModal } from './components/PaywallModal';
import { LoadingScreen } from './components/LoadingScreen';
import { Language } from './types';
import { pullCloudChanges } from './firebase/sync';
import { scheduleDailyNotification } from './utils/notifications';
import { initHardwareBackButton } from './utils/hardwareBackButton';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('book');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Initialize Android hardware back button handler
    initHardwareBackButton();

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

  // Safe live query for active in-stock used devices count
  const usedStockCount = useLiveQuery(
    async () => {
      try {
        if (!db.usedDevices) return 0;
        const devices = await db.usedDevices.toArray();
        return devices.filter(
          (d) => !d.deletedAt && d.syncStatus !== 'deleted' && d.status === 'in_stock'
        ).length;
      } catch (err) {
        console.warn('Error querying used stock count:', err);
        return 0;
      }
    },
    []
  ) ?? 0;

  const [checkingCloud, setCheckingCloud] = useState(false);
  const [checkedCloudUid, setCheckedCloudUid] = useState<string | null>(null);

  const isMismatched = Boolean(
    user &&
    settingsList &&
    settingsList.length > 0 &&
    settingsList[0].ownerUid &&
    settingsList[0].ownerUid !== user.uid
  );

  useEffect(() => {
    if (!user || settingsList === undefined) return;

    if (isMismatched) {
      clearLocalDatabase().then(() => {
        setCheckingCloud(true);
        pullCloudChanges(user.uid)
          .catch(err => console.warn('Could not pull cloud changes in App:', err))
          .finally(() => {
            setCheckedCloudUid(user.uid);
            setCheckingCloud(false);
          });
      });
      return;
    }

    if (settingsList.length === 0 && checkedCloudUid !== user.uid) {
      setCheckingCloud(true);
      pullCloudChanges(user.uid)
        .catch(err => console.warn('Could not pull cloud changes in App:', err))
        .finally(() => {
          setCheckedCloudUid(user.uid);
          setCheckingCloud(false);
        });
    }
  }, [user, settingsList, checkedCloudUid, isMismatched]);

  const currentSettings = settingsList && settingsList[0];
  const isWholesale = Boolean(currentSettings?.wholesaleMode);
  const showStock = currentSettings ? currentSettings.showStock !== false : true;
  const showRepairs = currentSettings ? !!currentSettings.showRepairs : false;
  const isAdmin = isSuperAdmin(user);

  useEffect(() => {
    if (isWholesale) {
      if (currentTab === 'repairs' || currentTab === 'tools') {
        setCurrentTab('book');
      }
    } else {
      if (currentTab === 'spares' || currentTab === 'clients') {
        setCurrentTab('book');
      }
      if (!showStock && currentTab === 'stock') {
        setCurrentTab('book');
      }
      if (!showRepairs && currentTab === 'repairs') {
        setCurrentTab('book');
      }
    }
  }, [isWholesale, showStock, showRepairs, currentTab]);

  // Auto-activate local settings unconditionally if superadmin is logged in
  useEffect(() => {
    if (isAdmin && currentSettings && !currentSettings.activated) {
      updateAppSettings({ activated: true }).catch((err) => {
        console.warn('Failed to auto-activate local settings for admin:', err);
      });
    }
  }, [isAdmin, currentSettings]);

  // Schedule daily closing summary notification if enabled
  useEffect(() => {
    if (currentSettings?.notificationsEnabled) {
      const cancel = scheduleDailyNotification(
        currentSettings.summaryNotificationTime || '20:30',
        currentSettings.shopName
      );
      return () => cancel();
    }
  }, [
    currentSettings?.notificationsEnabled,
    currentSettings?.summaryNotificationTime,
    currentSettings?.shopName,
  ]);

  // Loading state with timeout fallback
  if (settingsList === undefined) {
    return (
      <LoadingScreen
        message="Loading Day Book..."
        submessage="Preparing your offline registers"
        timeout={loadingTimeout}
        onReload={() => window.location.reload()}
      />
    );
  }

  // Show loading spinner while determining auth state, handling account switch, or pulling cloud data
  if (authLoading || isMismatched || (user && settingsList?.length === 0 && (checkingCloud || checkedCloudUid !== user.uid))) {
    return (
      <LoadingScreen
        message="Connecting to cloud..."
        submessage="Syncing latest shop transactions"
      />
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
  const trialDays = getTrialDaysRemaining(settings.firstLaunchDate);
  const isActivated = hasFullAccess(isProCurrentlyActive(settings), user);
  const isReadOnly = !isActivated && trialDays <= 0;

  return (
    <div className="min-h-screen bg-iosBg text-iosLabel font-sans flex flex-col justify-between selection:bg-iosBlue/20">
      {/* Active Screen View */}
      <main key={currentTab} className="flex-1 w-full max-w-lg mx-auto animate-fade-slide-in">
        {currentTab === 'book' && (
          <BookScreen
            language={language}
            shopName={settings.shopName}
            shopAddress={settings.shopAddress}
            isReadOnly={isReadOnly}
            isActivated={isActivated}
            trialDays={trialDays}
            onOpenPaywall={() => setIsPaywallOpen(true)}
          />
        )}
        {showStock && currentTab === 'stock' && (
          <StockScreen
            language={language}
            shopName={settings.shopName}
            isReadOnly={isReadOnly}
            isActivated={isActivated}
            onOpenPaywall={() => setIsPaywallOpen(true)}
          />
        )}
        {isWholesale && currentTab === 'spares' && (
          <SparesScreen
            language={language}
            shopName={settings.shopName}
            isReadOnly={isReadOnly}
            isActivated={isActivated}
          />
        )}
        {isWholesale && currentTab === 'clients' && (
          <ClientsScreen
            language={language}
            shopName={settings.shopName}
            shopPhone={settings.shopPhone}
            isReadOnly={isReadOnly}
            isActivated={isActivated}
          />
        )}
        {!isWholesale && showRepairs && currentTab === 'repairs' && (
          <RepairsScreen
            language={language}
            shopName={settings.shopName}
            isReadOnly={isReadOnly}
            isActivated={isActivated}
            trialDays={trialDays}
            onOpenPaywall={() => setIsPaywallOpen(true)}
          />
        )}
        {!isWholesale && currentTab === 'tools' && (
          <ToolsScreen
            language={language}
            shopName={settings.shopName}
            shopPhone={settings.shopAddress}
            shopAddress={settings.shopAddress}
            isReadOnly={isReadOnly}
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
        showStock={showStock}
        isWholesale={isWholesale}
        readyCount={readyJobsCount}
        lowStockCount={lowStockCount}
        usedStockCount={usedStockCount}
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
