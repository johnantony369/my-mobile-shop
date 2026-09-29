import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { TabBar, TabType } from './components/TabBar';
import { BookScreen } from './screens/BookScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { getTrialDaysRemaining } from './utils/activation';
import { Language } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('book');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Live query for settings
  const settingsList = useLiveQuery(() => db.settings.toArray(), [refreshTrigger]);

  // Loading state
  if (settingsList === undefined) {
    return (
      <div className="min-h-screen bg-iosBg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-iosBlue border-t-transparent rounded-full animate-spin" />
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
        {currentTab === 'reports' && (
          <ReportsScreen
            language={language}
            shopName={settings.shopName}
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
      />
    </div>
  );
}
