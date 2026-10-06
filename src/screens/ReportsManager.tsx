import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { formatINR } from '../i18n';
import { Card, SectionHeader } from '../components/iOSComponents';


export const ReportsManager: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month'>('today');

  const todayStr = new Date().toISOString().split('T')[0];

  // Live queries for entries, bills, appointments
  const allEntries = useLiveQuery(async () => {
    try {
      const items = await db.entries.toArray();
      return items.filter((e) => !e.deletedAt && e.syncStatus !== 'deleted');
    } catch {
      return [];
    }
  }, []) ?? [];

  const allAppointments = useLiveQuery(async () => {
    try {
      const items = await db.appointments.toArray();
      return items.filter((a) => !a.deletedAt && a.syncStatus !== 'deleted');
    } catch {
      return [];
    }
  }, []) ?? [];

  const allBills = useLiveQuery(async () => {
    try {
      const items = await db.bills.toArray();
      return items.filter((b) => !b.deletedAt && b.syncStatus !== 'deleted');
    } catch {
      return [];
    }
  }, []) ?? [];

  // Date filtering logic
  const now = new Date();
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - now.getDay());
  const weekStartStr = currentWeekStart.toISOString().split('T')[0];
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const filterByTime = (dateStr: string) => {
    if (timeframe === 'today') return dateStr === todayStr;
    if (timeframe === 'week') return dateStr >= weekStartStr && dateStr <= todayStr;
    return dateStr.startsWith(monthPrefix);
  };

  const filteredEntries = allEntries.filter((e) => filterByTime(e.date));
  const filteredAppointments = allAppointments.filter((a) => filterByTime(a.date));
  const filteredBills = allBills.filter((b) => filterByTime(b.date));

  // Metrics
  const revenueTotal = filteredEntries.reduce(
    (sum, e) => (e.type === 'in' ? sum + (e.amount || 0) : sum),
    0
  );

  const outstandingTotal = filteredBills.reduce(
    (sum, b) => sum + (b.balanceAmount || 0),
    0
  );

  const appointmentsCount = filteredAppointments.length;
  const customersCount = new Set(filteredAppointments.map((a) => a.customerPhone || a.customerName))
    .size;

  // Top Services
  const serviceCounts: Record<string, { count: number; revenue: number }> = {};
  filteredAppointments.forEach((a) => {
    const sName = a.serviceName || 'Standard Service';
    if (!serviceCounts[sName]) serviceCounts[sName] = { count: 0, revenue: 0 };
    serviceCounts[sName].count += 1;
    serviceCounts[sName].revenue += a.price || 0;
  });

  const topServices = Object.entries(serviceCounts)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  // Staff Performance
  const staffCounts: Record<string, { count: number; revenue: number }> = {};
  filteredAppointments.forEach((a) => {
    const stName = a.staffName || 'General Staff';
    if (!staffCounts[stName]) staffCounts[stName] = { count: 0, revenue: 0 };
    staffCounts[stName].count += 1;
    staffCounts[stName].revenue += a.price || 0;
  });

  const topStaff = Object.entries(staffCounts)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[20px] font-extrabold text-[#171717] tracking-tight">Reports</h2>
        <p className="text-[12px] text-[#8E8E93]">Salon revenue, appointments & staff performance</p>
      </div>

      {/* Timeframe Selector */}
      <div className="flex bg-[#EBEAE6] p-1 rounded-[14px]">
        {(['today', 'week', 'month'] as const).map((tf) => {
          const isActive = timeframe === tf;
          const label = tf === 'today' ? 'Today' : tf === 'week' ? 'This Week' : 'This Month';
          return (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`flex-1 py-1.5 rounded-[10px] text-[12px] font-bold transition-all ${
                isActive ? 'bg-white text-[#171717] shadow-xs' : 'text-[#6B6B6B]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <Card className="p-3.5">
          <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider block">
            Revenue
          </span>
          <span className="text-[22px] font-extrabold text-[#171717] mt-1 block truncate">
            {formatINR(revenueTotal)}
          </span>
        </Card>

        <Card className="p-3.5">
          <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider block">
            Appointments
          </span>
          <span className="text-[22px] font-extrabold text-[#171717] mt-1 block">
            {appointmentsCount}
          </span>
        </Card>

        <Card className="p-3.5">
          <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider block">
            Unique Clients
          </span>
          <span className="text-[22px] font-extrabold text-[#171717] mt-1 block">
            {customersCount}
          </span>
        </Card>

        <Card className="p-3.5">
          <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider block">
            Outstanding
          </span>
          <span
            className={`text-[22px] font-extrabold mt-1 block truncate ${
              outstandingTotal > 0 ? 'text-[#FF9500]' : 'text-[#171717]'
            }`}
          >
            {formatINR(outstandingTotal)}
          </span>
        </Card>
      </div>

      {/* Top Services */}
      <div>
        <SectionHeader title="Top Services" />
        {topServices.length === 0 ? (
          <Card className="p-6 text-center text-xs text-[#8E8E93]">No appointments in this period.</Card>
        ) : (
          <Card className="divide-y divide-black/[0.04]">
            {topServices.map(([sName, data], idx) => (
              <div key={sName} className="p-3 flex items-center justify-between text-[13px]">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="w-5 text-center text-xs font-bold text-[#8E8E93]">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-[#171717] truncate">{sName}</div>
                    <div className="text-[11px] text-[#8E8E93]">{data.count} bookings</div>
                  </div>
                </div>
                <span className="font-extrabold text-[#171717] shrink-0">
                  {formatINR(data.revenue)}
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>

      {/* Staff Performance */}
      <div>
        <SectionHeader title="Staff Revenue" />
        {topStaff.length === 0 ? (
          <Card className="p-6 text-center text-xs text-[#8E8E93]">No staff activity in this period.</Card>
        ) : (
          <Card className="divide-y divide-black/[0.04]">
            {topStaff.map(([stName, data], idx) => (
              <div key={stName} className="p-3 flex items-center justify-between text-[13px]">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="w-5 text-center text-xs font-bold text-[#8E8E93]">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-[#171717] truncate">{stName}</div>
                    <div className="text-[11px] text-[#8E8E93]">{data.count} appointments handled</div>
                  </div>
                </div>
                <span className="font-extrabold text-[#171717] shrink-0">
                  {formatINR(data.revenue)}
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
};
