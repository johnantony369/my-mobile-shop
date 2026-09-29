import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { TabBar, TabType } from './components/TabBar';
import { BookScreen } from './screens/BookScreen';
import { RepairsScreen } from './screens/RepairsScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { getTrialDaysRemaining } from './utils/activation';
import { requestPersistentStorage } from './utils/storage';
import { useAuth } from './firebase/useAuth';
import { LoginScreen } from './screens/LoginScreen';
import { Language } from './types';
import { Cloud, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('book');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
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

  // Loading state with timeout fallback
  if (settingsList === undefined) {
    return (
      <div className="min-h-screen bg-iosBg flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-9 h-9 border-3 border-iosBlue border-t-transparent rounded-full animate-spin mb-4" />
        {loadingTimeout && (
          <div className="mt-4 space-y-3 animate-fade-in">
            <p className="text-xs text-[#8E8E93]">
              ഡാറ്റ ലോഡ് ആകാൻ സമയമെടുക്കുന്നു...
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-iosBlue text-white text-xs font-semibold rounded-full shadow-sm"
            >
              റീലോഡ് ചെയ്യുക (Reload)
            </button>
          </div>
        )}
      </div>
    );
  }

  // Show loading spinner while determining auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-iosBg flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-9 h-9 border-3 border-iosBlue border-t-transparent rounded-full animate-spin mb-4" />
      </div>
    );
  }

  // If Firebase is configured and user is not logged in: SHOW LOGIN SCREEN
  if (isConfigured && !user) {
    return (
      <LoginScreen
        language={settingsList?.[0]?.language || 'en'}
        onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
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
  const language: Language = settings.language || 'en';
  const showRepairs = !!settings.showRepairs;
  const trialDays = getTrialDaysRemaining(settings.firstLaunchDate);
  const isReadOnly = !settings.activated && trialDays <= 0;

  return (
    <div className="min-h-screen bg-iosBg text-iosLabel font-sans flex flex-col justify-between selection:bg-iosBlue/20">
      {/* Top Floating Cloud Sync Status Indicator */}
      {user && (
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
      )}

      {/* Active Screen View */}
      <main className="flex-1 w-full max-w-lg mx-auto">
        {currentTab === 'book' && (
          <BookScreen
            language={language}
            shopName={settings.shopName}
            isReadOnly={isReadOnly}
          />
        )}
        {showRepairs && currentTab === 'repairs' && (
          <RepairsScreen
            language={language}
            shopName={settings.shopName}
            isReadOnly={isReadOnly}
          />
        )}
        {currentTab === 'reports' && (
          <ReportsScreen
            language={language}
            shopName={settings.shopName}
            showRepairs={showRepairs}
          />
        )}
        {currentTab === 'settings' && (
          <SettingsScreen
            settings={settings}
            language={language}
            onLanguageChange={() => setRefreshTrigger((prev) => prev + 1)}
            onRefreshSettings={() => setRefreshTrigger((prev) => prev + 1)}
          />
        )}
      </main>

      {/* Persistent Bottom Tab Bar */}
      <TabBar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        language={language}
        showRepairs={showRepairs}
        readyCount={readyJobsCount}
      />
    </div>
  );
}
