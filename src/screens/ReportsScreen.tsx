import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, computeSummary } from '../db/db';
import { Language } from '../types';
import { t, formatINR } from '../i18n';
import { formatMonthName } from '../utils/date';
import { DailyBarChart } from '../components/DailyBarChart';
import { buildShareSummaryText, shareSummary } from '../utils/share';
import { exportEntriesToCSV } from '../utils/csv';
import { ChevronLeft, ChevronRight, Share2, Download, ArrowDownLeft, ArrowUpRight, TrendingUp, Wrench } from 'lucide-react';

interface ReportsScreenProps {
  language: Language;
  shopName: string;
  showRepairs?: boolean;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  language,
  shopName,
  showRepairs = false,
}) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-12

  const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  // Fetch entries for this month from Dexie
  const entries = useLiveQuery(
    () =>
      db.entries
        .where('date')
        .between(`${monthStr}-01`, `${monthStr}-31`, true, true)
        .toArray(),
    [monthStr]
  ) ?? [];

  // Query delivered repairs in current month
  const allJobs = useLiveQuery(() => db.jobs.toArray()) ?? [];
  const deliveredRepairsThisMonth = allJobs.filter((j) => {
    if (j.status !== 'delivered' || !j.deliveredAt) return false;
    const d = new Date(j.deliveredAt);
    return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth;
  }).length;

  const summary = computeSummary(entries);

  // Compute daily totals for the bar chart
  const dailyTotals: { [day: number]: { in: number; out: number } } = {};
  entries.forEach((e) => {
    const day = parseInt(e.date.split('-')[2], 10);
    if (!dailyTotals[day]) {
      dailyTotals[day] = { in: 0, out: 0 };
    }
    const amt = Number(e.amount) || 0;
    if (e.type === 'in') {
      dailyTotals[day].in += amt;
    } else {
      dailyTotals[day].out += amt;
    }
  });

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthDisplay = formatMonthName(currentYear, currentMonth, language);

  const handleShare = async () => {
    const text = buildShareSummaryText({
      shopName,
      dateStr: monthDisplay,
      inTotal: summary.inTotal,
      inCount: summary.inCount,
      outTotal: summary.outTotal,
      net: summary.net,
      cashTotal: summary.cashTotal,
      upiTotal: summary.upiTotal,
      cardTotal: summary.cardTotal,
    });
    await shareSummary(text, `${shopName} - ${monthDisplay}`);
  };

  const handleExportCSV = () => {
    const filename = `Sales_${shopName.replace(/\s+/g, '_')}_${monthStr}.csv`;
    exportEntriesToCSV(entries, filename);
  };

  return (
    <div className="min-h-screen pb-24 pt-2">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <h1 className="text-[32px] font-extrabold text-black tracking-tight mb-2">
          {t('reports_header', language)}
        </h1>

        {/* Month Selector Pill */}
        <div className="bg-white rounded-[14px] p-2 flex items-center justify-between shadow-sm border border-black/[0.04] mb-3">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-black hover:bg-gray-100 active:scale-95 transition-all"
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-[17px] font-semibold text-black tracking-tight">
            {monthDisplay}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-black hover:bg-gray-100 active:scale-95 transition-all"
            aria-label="Next Month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          {/* Total In */}
          <div className="bg-white rounded-[14px] p-3.5 shadow-sm border border-black/[0.04]">
            <div className="flex items-center text-xs font-semibold text-[#8E8E93] mb-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-iosGreen mr-1" />
              <span>{t('total_in', language)}</span>
            </div>
            <p className="text-[20px] font-bold text-iosGreen tracking-tight">
              {formatINR(summary.inTotal)}
            </p>
            <span className="text-[11px] text-[#8E8E93]">
              {summary.inCount} {t('items_unit', language)}
            </span>
          </div>

          {/* Total Out */}
          <div className="bg-white rounded-[14px] p-3.5 shadow-sm border border-black/[0.04]">
            <div className="flex items-center text-xs font-semibold text-[#8E8E93] mb-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-iosRed mr-1" />
              <span>{t('total_out', language)}</span>
            </div>
            <p className="text-[20px] font-bold text-iosRed tracking-tight">
              {formatINR(summary.outTotal)}
            </p>
          </div>

          {/* Net Profit */}
          <div className="bg-white rounded-[14px] p-3.5 shadow-sm border border-black/[0.04]">
            <div className="flex items-center text-xs font-semibold text-[#8E8E93] mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-iosBlue mr-1" />
              <span>{t('net_profit', language)}</span>
            </div>
            <p
              className={`text-[20px] font-bold tracking-tight ${
                summary.net >= 0 ? 'text-black' : 'text-iosRed'
              }`}
            >
              {formatINR(summary.net)}
            </p>
          </div>

          {/* Total Entries */}
          <div className="bg-white rounded-[14px] p-3.5 shadow-sm border border-black/[0.04]">
            <div className="flex items-center text-xs font-semibold text-[#8E8E93] mb-1">
              <span>{t('entries_count', language)}</span>
            </div>
            <p className="text-[20px] font-bold text-black tracking-tight">
              {entries.length}
            </p>
            <span className="text-[11px] text-[#8E8E93]">
              {t('tab_book', language)}
            </span>
          </div>
        </div>

        {/* Repairs Delivered Stat Row (if showRepairs is enabled) */}
        {showRepairs && (
          <div className="bg-white rounded-[14px] p-3.5 shadow-sm border border-black/[0.04] mb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[14px] font-semibold text-black block">
                  {t('stat_repairs_delivered', language)}
                </span>
                <span className="text-xs text-[#8E8E93]">
                  {t('stat_repairs_delivered_desc', language)}
                </span>
              </div>
            </div>
            <span className="text-[20px] font-bold text-black tracking-tight">
              {deliveredRepairsThisMonth}
            </span>
          </div>
        )}

        {/* Payment Breakdown Card */}
        <div className="bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04] mb-3">
          <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-3">
            {t('payment_breakdown_title', language)}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 rounded-[10px] p-2.5 text-center">
              <span className="text-xs font-medium text-[#8E8E93] block">Cash</span>
              <span className="text-[15px] font-bold text-black mt-0.5 block">
                {formatINR(summary.cashTotal)}
              </span>
            </div>
            <div className="bg-blue-50/70 rounded-[10px] p-2.5 text-center">
              <span className="text-xs font-medium text-iosBlue block">UPI</span>
              <span className="text-[15px] font-bold text-iosBlue mt-0.5 block">
                {formatINR(summary.upiTotal)}
              </span>
            </div>
            <div className="bg-purple-50/70 rounded-[10px] p-2.5 text-center">
              <span className="text-xs font-medium text-purple-600 block">Card</span>
              <span className="text-[15px] font-bold text-purple-700 mt-0.5 block">
                {formatINR(summary.cardTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Daily Sales Chart */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider px-1 mb-2">
            {t('daily_sales_chart_title', language)}
          </h3>
          <DailyBarChart
            year={currentYear}
            month={currentMonth}
            dailyTotals={dailyTotals}
          />
        </div>

        {/* Action Buttons: Share & Export */}
        <div className="space-y-2 mb-6">
          <button
            type="button"
            onClick={handleShare}
            className="w-full h-12 bg-white rounded-[14px] flex items-center justify-center space-x-2 text-iosBlue font-semibold shadow-sm border border-black/[0.04] active:bg-gray-50 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>{t('share_month_summary', language)}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="w-full h-12 bg-white rounded-[14px] flex items-center justify-center space-x-2 text-black font-semibold shadow-sm border border-black/[0.04] active:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4 text-[#8E8E93]" />
            <span>{t('export_csv_btn', language)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
