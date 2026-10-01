import React from 'react';
import { BookOpen, Package, Wrench, BarChart3, Settings } from 'lucide-react';
import { Language } from '../types';
import { t } from '../i18n';

export type TabType = 'book' | 'stock' | 'repairs' | 'reports' | 'settings';

interface TabBarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  language: Language;
  showRepairs?: boolean;
  readyCount?: number;
  lowStockCount?: number;
}

export const TabBar: React.FC<TabBarProps> = ({
  currentTab,
  onTabChange,
  language,
  showRepairs = false,
  readyCount = 0,
  lowStockCount = 0,
}) => {
  const tabs = [
    {
      id: 'book' as TabType,
      label: t('tab_book', language),
      icon: BookOpen,
      badge: 0,
      badgeColor: 'bg-iosGreen',
    },
    {
      id: 'stock' as TabType,
      label: t('tab_stock', language),
      icon: Package,
      badge: lowStockCount,
      badgeColor: 'bg-amber-500',
    },
    ...(showRepairs
      ? [
          {
            id: 'repairs' as TabType,
            label: t('tab_repairs', language),
            icon: Wrench,
            badge: readyCount,
            badgeColor: 'bg-iosGreen',
          },
        ]
      : []),
    {
      id: 'reports' as TabType,
      label: t('tab_reports', language),
      icon: BarChart3,
      badge: 0,
      badgeColor: 'bg-iosGreen',
    },
    {
      id: 'settings' as TabType,
      label: t('tab_settings', language),
      icon: Settings,
      badge: 0,
      badgeColor: 'bg-iosGreen',
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
              className={`flex-1 flex flex-col items-center justify-center h-full active:scale-95 transition-all duration-150 relative select-none ${
                isActive ? 'text-iosBlue' : 'text-[#8E8E93] hover:text-black/70'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-[22px] h-[22px] transition-transform duration-200 ease-out ${
                    isActive ? 'stroke-[2.2px] scale-105' : 'stroke-[1.8px] scale-100'
                  }`}
                />
                {tab.badge > 0 && (
                  <span className={`absolute -top-1 -right-2 ${tab.badgeColor || 'bg-iosGreen'} text-white text-[10px] font-bold min-w-[16px] h-4 rounded-full px-1 flex items-center justify-center shadow-xs animate-pulse`}>
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight font-medium transition-colors duration-150 ${
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
