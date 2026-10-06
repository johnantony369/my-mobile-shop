import React, { useState } from 'react';
import { AppSettings, SalonService, StaffMember } from '../types';
import { ServicesManager } from './ServicesManager';
import { StaffManager } from './StaffManager';
import { ReportsManager } from './ReportsManager';
import { SettingsManager } from './SettingsManager';
import { Card } from '../components/iOSComponents';
import {
  Scissors,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

interface MoreScreenProps {
  settings: AppSettings;
  onRefreshSettings: () => void;
  onOpenPaywall: () => void;
  onAddService: () => void;
  onEditService: (service: SalonService) => void;
  onAddStaff: () => void;
  onEditStaff: (staff: StaffMember) => void;
}

type SubSection = 'menu' | 'services' | 'staff' | 'reports' | 'settings';

export const MoreScreen: React.FC<MoreScreenProps> = ({
  settings,
  onRefreshSettings,
  onOpenPaywall,
  onAddService,
  onEditService,
  onAddStaff,
  onEditStaff,
}) => {
  const [activeSubSection, setActiveSubSection] = useState<SubSection>('menu');

  if (activeSubSection !== 'menu') {
    return (
      <div className="min-h-screen pb-28 px-4 pt-3 max-w-lg mx-auto space-y-4">
        {/* Back navigation */}
        <button
          type="button"
          onClick={() => setActiveSubSection('menu')}
          className="flex items-center gap-1 text-[13px] font-bold text-[#171717] hover:opacity-80 active:scale-95 transition-all select-none pt-2"
        >
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Back to More</span>
        </button>

        {activeSubSection === 'services' && (
          <ServicesManager onAddService={onAddService} onEditService={onEditService} />
        )}
        {activeSubSection === 'staff' && (
          <StaffManager onAddStaff={onAddStaff} onEditStaff={onEditStaff} />
        )}
        {activeSubSection === 'reports' && <ReportsManager />}
        {activeSubSection === 'settings' && (
          <SettingsManager
            settings={settings}
            onRefreshSettings={onRefreshSettings}
            onOpenPaywall={onOpenPaywall}
          />
        )}
      </div>
    );
  }

  const menuItems = [
    {
      id: 'services' as SubSection,
      title: 'Services Menu',
      subtitle: 'Haircuts, facials, coloring & prices',
      icon: Scissors,
      color: 'bg-[#F6F5F3] text-[#171717]',
    },
    {
      id: 'staff' as SubSection,
      title: 'Staff & Team',
      subtitle: 'Stylists, beauticians & schedules',
      icon: Users,
      color: 'bg-[#F6F5F3] text-[#171717]',
    },
    {
      id: 'reports' as SubSection,
      title: 'Reports & Revenue',
      subtitle: 'Sales breakdown, top services & staff stats',
      icon: BarChart3,
      color: 'bg-[#F6F5F3] text-[#171717]',
    },
    {
      id: 'settings' as SubSection,
      title: 'Salon Settings',
      subtitle: 'Profile, business hours, cloud backup & subscription',
      icon: SettingsIcon,
      color: 'bg-[#F6F5F3] text-[#171717]',
    },
  ];

  return (
    <div className="min-h-screen pb-28 px-4 pt-3 max-w-lg mx-auto space-y-4 select-none">
      <div className="pt-2">
        <h1 className="text-[28px] font-extrabold text-[#171717] tracking-tight leading-tight">
          More
        </h1>
        <p className="text-[12px] text-[#8E8E93] font-medium">
          Management, team & salon settings
        </p>
      </div>

      <div className="space-y-2.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.id}
              onClick={() => setActiveSubSection(item.id)}
              className="p-4 flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 ${item.color}`}
                >
                  <Icon className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-bold text-[#171717] leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-[12px] text-[#8E8E93] truncate mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-[#C7C7CC] shrink-0" />
            </Card>
          );
        })}
      </div>
    </div>
  );
};
