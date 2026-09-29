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
import { Language } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('book');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
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

  // First launch / no settings: show Onboarding
  if (settingsList.length === 0) {
    return (
      <OnboardingScreen
        onComplete={() => setRefreshTrigger((prev) => prev + 1)}
      />
    );
  }

  const settings = settingsList[0];
  const language: Language = settings.language || 'ml';
  const showRepairs = !!settings.showRepairs;
  const trialDays = getTrialDaysRemaining(settings.firstLaunchDate);
  const isReadOnly = !settings.activated && trialDays <= 0;

  return (
    <div className="min-h-screen bg-iosBg text-iosLabel font-sans flex flex-col justify-between selection:bg-iosBlue/20">
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
