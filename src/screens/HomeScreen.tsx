import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Appointment } from '../types';
import { formatINR } from '../i18n';
import { getLocalDateString } from '../utils/date';
import { Card, SectionHeader, StatusBadge } from '../components/iOSComponents';
import {
  Calendar,
  Plus,
  AlertCircle,
  Receipt,
  User,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface HomeScreenProps {
  shopName: string;
  ownerName?: string;
  onNewAppointment: () => void;
  onNewBill: (appointment?: Appointment) => void;
  onSelectAppointment: (appointment: Appointment) => void;
  onGoToAppointments: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  shopName,
  ownerName,
  onNewAppointment,
  onNewBill,
  onSelectAppointment,
  onGoToAppointments,
}) => {
  const todayStr = getLocalDateString();

  // Live queries for Today
  const todayAppointments = useLiveQuery(async () => {
    try {
      const items = await db.appointments.where('date').equals(todayStr).toArray();
      return items
        .filter((a) => !a.deletedAt && a.syncStatus !== 'deleted')
        .sort((a, b) => a.time.localeCompare(b.time));
    } catch {
      return [];
    }
  }, [todayStr]) ?? [];

  const todayEntries = useLiveQuery(async () => {
    try {
      const items = await db.entries.where('date').equals(todayStr).toArray();
      return items.filter((e) => !e.deletedAt && e.syncStatus !== 'deleted');
    } catch {
      return [];
    }
  }, [todayStr]) ?? [];

  const todayBills = useLiveQuery(async () => {
    try {
      const items = await db.bills.where('date').equals(todayStr).toArray();
      return items.filter((b) => !b.deletedAt && b.syncStatus !== 'deleted');
    } catch {
      return [];
    }
  }, [todayStr]) ?? [];

  // Metrics
  const todayRevenue = todayEntries.reduce(
    (sum, e) => (e.type === 'in' ? sum + (e.amount || 0) : sum),
    0
  );

  const pendingPaymentsTotal = todayBills.reduce(
    (sum, b) => sum + (b.balanceAmount || 0),
    0
  );

  // Distinct customers today
  const customersTodayCount = new Set([
    ...todayAppointments.map((a) => a.customerPhone || a.customerName),
    ...todayBills.map((b) => b.customerPhone || b.customerName),
  ]).size;

  // Alerts to surface
  const unconfirmedCount = todayAppointments.filter((a) => a.status === 'booked').length;

  // Greeting
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? 'Good morning'
      : currentHour < 17
      ? 'Good afternoon'
      : 'Good evening';

  const displayName = ownerName || shopName || 'Partner';

  return (
    <div className="min-h-screen pb-28 px-4 pt-3 max-w-lg mx-auto space-y-4">
      {/* 1. Top Header Area */}
      <div className="pt-2 pb-1 select-none">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider">
            {shopName || 'MySalon'}
          </span>
          <span className="text-[12px] font-semibold text-[#6B6B6B] bg-[#EBEAE6] px-2.5 py-0.5 rounded-full">
            Today
          </span>
        </div>
        <h1 className="text-[26px] font-extrabold text-[#171717] tracking-tight leading-tight mt-0.5">
          {greeting}, {displayName}
        </h1>
      </div>

      {/* 2. Actionable Alerts (if any) */}
      {(unconfirmedCount > 0 || pendingPaymentsTotal > 0) && (
        <div className="space-y-2">
          {unconfirmedCount > 0 && (
            <div
              onClick={onGoToAppointments}
              className="bg-[#FFF8E1] border border-[#FFE082] rounded-[16px] p-3 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#B78103] shrink-0" />
                <span className="text-[13px] font-medium text-[#795548]">
                  <strong className="text-[#5D4037]">{unconfirmedCount} unconfirmed</strong>{' '}
                  appointment{unconfirmedCount > 1 ? 's' : ''} today
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#B78103]" />
            </div>
          )}
          {pendingPaymentsTotal > 0 && (
            <div className="bg-[#FFF0F0] border border-[#FFCDD2] rounded-[16px] p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-4 h-4 text-[#D32F2F] shrink-0" />
                <span className="text-[13px] font-medium text-[#C62828]">
                  <strong>{formatINR(pendingPaymentsTotal)}</strong> pending payments to collect
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Primary Dashboard 4 Metric Cards */}
      <div className="grid grid-cols-2 gap-2.5 select-none">
        {/* Today's Appointments */}
        <Card
          onClick={onGoToAppointments}
          className="p-3.5 flex flex-col justify-between min-h-[92px]"
        >
          <div className="flex items-center justify-between text-[#6B6B6B]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Appointments</span>
            <Calendar className="w-4 h-4 text-[#6B6B6B]" />
          </div>
          <div className="mt-2">
            <span className="text-[26px] font-extrabold text-[#171717] tracking-tight block leading-none">
              {todayAppointments.length}
            </span>
            <span className="text-[11px] text-[#8E8E93] mt-1 block">
              {todayAppointments.filter((a) => a.status === 'completed').length} completed
            </span>
          </div>
        </Card>

        {/* Today's Revenue */}
        <Card className="p-3.5 flex flex-col justify-between min-h-[92px]">
          <div className="flex items-center justify-between text-[#6B6B6B]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Revenue</span>
            <TrendingUp className="w-4 h-4 text-[#34C759]" />
          </div>
          <div className="mt-2">
            <span className="text-[24px] font-extrabold text-[#171717] tracking-tight block leading-none truncate">
              {formatINR(todayRevenue)}
            </span>
            <span className="text-[11px] text-[#34C759] font-medium mt-1 block">
              {todayEntries.filter((e) => e.type === 'in').length} sales recorded
            </span>
          </div>
        </Card>

        {/* Pending Payments */}
        <Card className="p-3.5 flex flex-col justify-between min-h-[92px]">
          <div className="flex items-center justify-between text-[#6B6B6B]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending</span>
            <Receipt className="w-4 h-4 text-[#FF9500]" />
          </div>
          <div className="mt-2">
            <span
              className={`text-[22px] font-extrabold tracking-tight block leading-none truncate ${
                pendingPaymentsTotal > 0 ? 'text-[#FF9500]' : 'text-[#171717]'
              }`}
            >
              {formatINR(pendingPaymentsTotal)}
            </span>
            <span className="text-[11px] text-[#8E8E93] mt-1 block">
              {pendingPaymentsTotal > 0 ? 'Needs collection' : 'All clear'}
            </span>
          </div>
        </Card>

        {/* Customers Today */}
        <Card className="p-3.5 flex flex-col justify-between min-h-[92px]">
          <div className="flex items-center justify-between text-[#6B6B6B]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Customers</span>
            <User className="w-4 h-4 text-[#6B6B6B]" />
          </div>
          <div className="mt-2">
            <span className="text-[26px] font-extrabold text-[#171717] tracking-tight block leading-none">
              {customersTodayCount}
            </span>
            <span className="text-[11px] text-[#8E8E93] mt-1 block">Visits today</span>
          </div>
        </Card>
      </div>

      {/* 4. Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onNewAppointment}
          className="h-12 bg-[#171717] hover:bg-[#2C2C2E] active:scale-[0.98] text-white rounded-[16px] text-[14px] font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Appointment</span>
        </button>

        <button
          type="button"
          onClick={() => onNewBill()}
          className="h-12 bg-white hover:bg-gray-50 active:scale-[0.98] text-[#171717] border border-black/[0.08] rounded-[16px] text-[14px] font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
        >
          <Receipt className="w-4 h-4 stroke-[2]" />
          <span>New Sale / Bill</span>
        </button>
      </div>

      {/* 5. Today's Schedule Timeline / List */}
      <div>
        <SectionHeader
          title="Today's Schedule"
          actionText="View all"
          onAction={onGoToAppointments}
          count={todayAppointments.length}
        />

        {todayAppointments.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-[#F6F5F3] text-[#8E8E93] rounded-full flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-[16px] font-bold text-[#171717]">Your day is clear</h4>
              <p className="text-[12px] text-[#8E8E93] mt-0.5">
                No appointments booked for today yet.
              </p>
            </div>
            <button
              type="button"
              onClick={onNewAppointment}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#171717] text-white text-[12px] font-bold rounded-full shadow-xs active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Appointment</span>
            </button>
          </Card>
        ) : (
          <div className="space-y-2">
            {todayAppointments.map((appt) => (
              <Card
                key={appt.id}
                onClick={() => onSelectAppointment(appt)}
                className="p-3.5 flex items-center justify-between gap-3"
              >
                {/* Time & Indicator */}
                <div className="w-16 shrink-0">
                  <span className="text-[13px] font-black text-[#171717] block leading-tight">
                    {appt.time}
                  </span>
                  <span className="text-[10px] text-[#8E8E93] block mt-0.5">
                    {appt.durationMinutes} min
                  </span>
                </div>

                {/* Customer & Service Info */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-[14px] font-bold text-[#171717] truncate leading-tight">
                      {appt.customerName}
                    </h4>
                  </div>
                  <p className="text-[12px] text-[#6B6B6B] truncate mt-0.5">
                    {appt.serviceName}
                    {appt.staffName ? ` • ${appt.staffName}` : ''}
                  </p>
                </div>

                {/* Price & Status */}
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <span className="text-[14px] font-extrabold text-[#171717]">
                    {formatINR(appt.price)}
                  </span>
                  <StatusBadge status={appt.status} size="sm" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
