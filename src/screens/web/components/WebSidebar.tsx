import React from 'react';
import {
  BookOpen,
  Package,
  Wrench,
  Wrench as ToolsIcon,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { TabType } from '../../../components/TabBar';
import { Language, AppSettings } from '../../../types';
import { t } from '../../../i18n';

interface WebSidebarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  language: Language;
  settings?: AppSettings;
  isActivated?: boolean;
  trialDays?: number;
  showRepairs?: boolean;
  showStock?: boolean;
  readyCount?: number;
  lowStockCount?: number;
  usedStockCount?: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenPaywall?: () => void;
  onSignOut?: () => void;
  userEmail?: string | null;
}

export const WebSidebar: React.FC<WebSidebarProps> = ({
  currentTab,
  onTabChange,
  language,
  settings,
  isActivated,
  trialDays = 0,
  showRepairs = true,
  showStock = true,
  readyCount = 0,
  lowStockCount = 0,
  usedStockCount = 0,
  isCollapsed,
  onToggleCollapse,
  onOpenPaywall,
  onSignOut,
  userEmail,
}) => {
  const navItems = [
    {
      id: 'book' as TabType,
      label: t('tab_book', language) || 'Day Book',
      icon: BookOpen,
      badge: 0,
      badgeColor: 'bg-emerald-500',
    },
    ...(showStock
      ? [
          {
            id: 'stock' as TabType,
            label: t('tab_stock', language) || 'Inventory',
            icon: Package,
            badge: lowStockCount + usedStockCount,
            badgeColor: 'bg-amber-500',
          },
        ]
      : []),
    ...(showRepairs
      ? [
          {
            id: 'repairs' as TabType,
            label: t('tab_repairs', language) || 'Repairs',
            icon: Wrench,
            badge: readyCount,
            badgeColor: 'bg-indigo-500',
          },
        ]
      : []),
    {
      id: 'tools' as TabType,
      label: 'Tools & Reports',
      icon: ToolsIcon,
      badge: 0,
      badgeColor: 'bg-blue-500',
    },
    {
      id: 'settings' as TabType,
      label: 'Settings',
      icon: Settings,
      badge: 0,
      badgeColor: 'bg-slate-500',
    },
  ];

  const shopName = settings?.shopName || 'My Mobile Shop';

  return (
    <aside
      className={`h-screen sticky top-0 flex flex-col bg-slate-900 text-white transition-all duration-300 z-40 select-none border-r border-slate-800 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Shop Branding Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
            <span className="text-lg font-black text-white">
              {shopName.charAt(0).toUpperCase()}
            </span>
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-bold text-white truncate tracking-tight">
                {shopName}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-medium text-slate-400">Desktop Web</span>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {!isCollapsed && (
                <span className="flex-1 text-left truncate">{item.label}</span>
              )}
              {item.badge > 0 && (
                <span
                  className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full text-white ${item.badgeColor} shrink-0`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Pro Plan Card / Chip */}
      <div className="p-3 border-t border-slate-800">
        {!isActivated ? (
          <button
            type="button"
            onClick={onOpenPaywall}
            className={`w-full p-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 text-left hover:border-amber-400 transition-all ${
              isCollapsed ? 'flex justify-center p-2.5' : ''
            }`}
            title="Upgrade to Pro"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              {!isCollapsed && (
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <span>Upgrade to Pro</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-400 text-slate-950 font-black">
                      ₹249/mo
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-300/80 mt-0.5">
                    {trialDays > 0 ? `${trialDays} trial days left` : 'Trial ended • Unlock Pro'}
                  </p>
                </div>
              )}
            </div>
          </button>
        ) : (
          !isCollapsed && (
            <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-bold">Pro Active</span>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Lifetime</span>
            </div>
          )
        )}

        {/* User Account & Switch to Mobile View */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold shrink-0">
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">
                  {userEmail || 'Shop Owner'}
                </p>
                <a
                  href="/app"
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                  title="Switch to Mobile interface"
                >
                  <span>Switch to Mobile</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            )}
          </div>
          {onSignOut && !isCollapsed && (
            <button
              type="button"
              onClick={onSignOut}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
