import React, { useState, useEffect } from 'react';
import { db, computeSummary } from '../db/db';
import { Entry, Language, DaySummary } from '../types';
import { getLocalDateString, getYesterdayLocalDateString, formatHeaderDate } from '../utils/date';
import { formatINR, t } from '../i18n';
import { buildShareSummaryText, shareSummary } from '../utils/share';
import { Share2, X, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface DailyRitualCardProps {
  language: Language;
  shopName: string;
}

export const DailyRitualCard: React.FC<DailyRitualCardProps> = ({
  language,
  shopName,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [yesterdayStr, setYesterdayStr] = useState('');

  useEffect(() => {
    const today = getLocalDateString();
    const lastDismissedKey = `ritual_dismissed_${today}`;
    const wasDismissedToday = localStorage.getItem(lastDismissedKey);

    if (wasDismissedToday) {
      return;
    }

    const yDate = getYesterdayLocalDateString();
    setYesterdayStr(yDate);

    // Fetch yesterday's entries from Dexie
    db.entries
      .where('date')
      .equals(yDate)
      .toArray()
      .then((entries: Entry[]) => {
        const active = entries.filter((e) => !e.deletedAt && e.syncStatus !== 'deleted');
        const sum = computeSummary(active);
        setSummary(sum);
        setIsVisible(true);
      })
      .catch((err) => {
        console.error('Failed to load yesterday entries:', err);
      });
  }, []);

  const handleDismiss = () => {
    const today = getLocalDateString();
    localStorage.setItem(`ritual_dismissed_${today}`, 'true');
    setIsVisible(false);
  };

  const handleShare = async () => {
    if (!summary) return;
    const formattedDate = formatHeaderDate(yesterdayStr, language);
    const text = buildShareSummaryText({
      shopName,
      dateStr: formattedDate,
      inTotal: summary.inTotal,
      inCount: summary.inCount,
      outTotal: summary.outTotal,
      net: summary.net,
      cashTotal: summary.cashTotal,
      upiTotal: summary.upiTotal,
      cardTotal: summary.cardTotal,
    });
    await shareSummary(text, `${t('yesterday_summary_title', language)} - ${shopName}`);
  };

  if (!isVisible || !summary) return null;

  const hasEntries = summary.inCount > 0 || summary.outTotal > 0;

  return (
    <div className="mx-4 mb-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-[14px] p-3.5 shadow-sm relative transition-all duration-200 animate-fade-slide-in">
      <div className="flex items-center justify-between pb-2 border-b border-blue-100">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-iosBlue animate-pulse" />
          <h4 className="text-[15px] font-semibold text-iosBlue">
            {t('yesterday_summary_title', language)}
          </h4>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-[#8E8E93] hover:text-black p-1 -mr-1"
          aria-label={t('dismiss_btn', language)}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {hasEntries ? (
        <div className="mt-2.5">
          <div className="grid grid-cols-3 gap-2 text-center py-1">
            <div className="bg-white/80 rounded-lg p-2 border border-blue-100/50">
              <span className="text-[11px] font-medium text-[#8E8E93] flex items-center justify-center">
                <ArrowDownLeft className="w-3 h-3 text-iosGreen mr-0.5" />
                {t('summary_in', language)}
              </span>
              <p className="text-[14px] font-bold text-iosGreen mt-0.5">
                {formatINR(summary.inTotal)}
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-2 border border-blue-100/50">
              <span className="text-[11px] font-medium text-[#8E8E93] flex items-center justify-center">
                <ArrowUpRight className="w-3 h-3 text-iosRed mr-0.5" />
                {t('summary_out', language)}
              </span>
              <p className="text-[14px] font-bold text-iosRed mt-0.5">
                {formatINR(summary.outTotal)}
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-2 border border-blue-100/50">
              <span className="text-[11px] font-medium text-[#8E8E93]">
                {t('summary_net', language)}
              </span>
              <p className={`text-[14px] font-bold mt-0.5 ${summary.net >= 0 ? 'text-black' : 'text-iosRed'}`}>
                {formatINR(summary.net)}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between pt-1">
            <span className="text-[11px] text-[#8E8E93]">
              Cash {formatINR(summary.cashTotal)} • UPI {formatINR(summary.upiTotal)} • Card {formatINR(summary.cardTotal)}
            </span>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center space-x-1 px-3 py-1 bg-iosBlue text-white text-xs font-semibold rounded-full shadow-sm active:opacity-80 transition-opacity"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{t('share_btn', language)}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 py-1 text-center">
          <p className="text-xs text-[#8E8E93]">
            {t('yesterday_no_entries', language)}
          </p>
        </div>
      )}
    </div>
  );
};
