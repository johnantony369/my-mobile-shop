import React from 'react';
import { Home, Calendar, Users, MoreHorizontal } from 'lucide-react';

export type MainTab = 'home' | 'appointments' | 'customers' | 'more';

interface TabBarProps {
  currentTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  todayAppointmentsCount?: number;
}

export const TabBar: React.FC<TabBarProps> = ({
  currentTab,
  onTabChange,
  todayAppointmentsCount = 0,
}) => {
  const tabs = [
    {
      id: 'home' as MainTab,
      label: 'Home',
      icon: Home,
      badge: 0,
    },
    {
      id: 'appointments' as MainTab,
      label: 'Appointments',
      icon: Calendar,
      badge: todayAppointmentsCount,
    },
    {
      id: 'customers' as MainTab,
      label: 'Customers',
      icon: Users,
      badge: 0,
    },
    {
      id: 'more' as MainTab,
      label: 'More',
      icon: MoreHorizontal,
      badge: 0,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/92 backdrop-blur-xl border-t border-[#E5E5EA]/80 pb-[env(safe-area-inset-bottom)] select-none">
      <div className="flex items-center justify-around h-[56px] max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center h-full active:scale-95 transition-all duration-150 relative ${
                isActive ? 'text-[#171717]' : 'text-[#8E8E93] hover:text-[#171717]/80'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-[23px] h-[23px] transition-transform duration-200 ease-out ${
                    isActive ? 'stroke-[2.2px] scale-105 text-[#171717]' : 'stroke-[1.8px] scale-100 text-[#8E8E93]'
                  }`}
                />
                {tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-[#171717] text-white text-[10px] font-bold min-w-[17px] h-[17px] rounded-full px-1 flex items-center justify-center shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10.5px] mt-1 tracking-tight transition-colors duration-150 ${
                  isActive ? 'font-semibold text-[#171717]' : 'font-medium text-[#8E8E93]'
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

// Backward-compatibility export for TabType if needed
export type TabType = any;
