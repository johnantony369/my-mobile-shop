import React from 'react';
import { BookOpen, Wrench, BarChart3, Settings } from 'lucide-react';
import { Language } from '../types';
import { t } from '../i18n';

export type TabType = 'book' | 'repairs' | 'reports' | 'settings';

interface TabBarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  language: Language;
  showRepairs?: boolean;
  readyCount?: number;
}

export const TabBar: React.FC<TabBarProps> = ({
  currentTab,
  onTabChange,
  language,
  showRepairs = false,
  readyCount = 0,
}) => {
  const tabs = [
    {
      id: 'book' as TabType,
      label: t('tab_book', language),
      icon: BookOpen,
      badge: 0,
    },
    ...(showRepairs
      ? [
          {
            id: 'repairs' as TabType,
            label: t('tab_repairs', language),
            icon: Wrench,
            badge: readyCount,
          },
        ]
      : []),
    {
      id: 'reports' as TabType,
      label: t('tab_reports', language),
      icon: BarChart3,
      badge: 0,
    },
    {
      id: 'settings' as TabType,
      label: t('tab_settings', language),
      icon: Settings,
      badge: 0,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-[#3C3C43]/15 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-[50px] max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center h-full active:opacity-70 transition-colors relative ${
                isActive ? 'text-iosBlue' : 'text-[#8E8E93]'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-[22px] h-[22px] ${
                    isActive ? 'stroke-[2.2px]' : 'stroke-[1.8px]'
                  }`}
                />
                {tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-iosGreen text-white text-[10px] font-bold min-w-[16px] h-4 rounded-full px-1 flex items-center justify-center shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight font-medium ${
                  isActive ? 'font-semibold text-iosBlue' : 'text-[#8E8E93]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
