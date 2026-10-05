import React from 'react';
import { DaySummary, Language } from '../types';
import { formatINR, t } from '../i18n';
import { Share2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { buildShareSummaryText, shareSummary } from '../utils/share';

interface SummaryCardProps {
  summary: DaySummary;
  dateDisplay: string;
  shopName: string;
  language: Language;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  summary,
  dateDisplay,
  shopName,
  language,
}) => {
  const handleShare = async () => {
    const text = buildShareSummaryText({
      shopName,
      dateStr: dateDisplay,
      inTotal: summary.inTotal,
      inCount: summary.inCount,
      outTotal: summary.outTotal,
      net: summary.net,
      cashTotal: summary.cashTotal,
      upiTotal: summary.upiTotal,
      cardTotal: summary.cardTotal,
    });
    await shareSummary(text, `${shopName} - ${dateDisplay}`);
  };

  return (
    <div className="mx-4 mb-3 bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04]">
      {/* Top 3 metrics */}
      <div className="grid grid-cols-3 gap-2 text-center pb-3.5 border-b border-[#E5E5EA]">
        {/* IN */}
        <div className="flex flex-col items-center justify-between">
          <div className="flex items-center text-xs font-semibold text-[#8E8E93] mb-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-iosGreen mr-0.5" />
            <span>{t('summary_in', language)}</span>
          </div>
          <span className="text-[22px] sm:text-[26px] font-black text-iosGreen tracking-tight leading-tight truncate max-w-full px-0.5">
            {formatINR(summary.inTotal)}
          </span>
          <span className="text-[11px] text-[#8E8E93] mt-1 font-medium">
            {summary.inCount} {t('items_unit', language)}
          </span>
        </div>

        {/* OUT */}
        <div className="flex flex-col items-center justify-between border-x border-[#E5E5EA] px-1">
          <div className="flex items-center text-xs font-semibold text-[#8E8E93] mb-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-iosRed mr-0.5" />
            <span>{t('summary_out', language)}</span>
          </div>
          <span className="text-[22px] sm:text-[26px] font-black text-iosRed tracking-tight leading-tight truncate max-w-full px-0.5">
            {formatINR(summary.outTotal)}
          </span>
          <span className="text-[11px] text-transparent mt-1 select-none pointer-events-none">
            -
          </span>
        </div>

        {/* NET */}
        <div className="flex flex-col items-center justify-between">
          <div className="flex items-center text-xs font-semibold text-[#8E8E93] mb-1">
            <span>{t('summary_net', language)}</span>
          </div>
          <span
            className={`text-[22px] sm:text-[26px] font-black tracking-tight leading-tight truncate max-w-full px-0.5 ${
              summary.net >= 0 ? 'text-black' : 'text-iosRed'
            }`}
          >
            {formatINR(summary.net)}
          </span>
          <span className="text-[11px] text-transparent mt-1 select-none pointer-events-none">
            -
          </span>
        </div>
      </div>

      {/* Cash / UPI / Card / Credit breakdown row */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-[#8E8E93]">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 font-medium">
            Cash: <strong className="ml-1 text-black font-bold">{formatINR(summary.cashTotal)}</strong>
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-iosBlue font-medium">
            UPI: <strong className="ml-1 font-bold">{formatINR(summary.upiTotal)}</strong>
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 font-medium">
            Card: <strong className="ml-1 font-bold">{formatINR(summary.cardTotal)}</strong>
          </span>
          {summary.creditTotal > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 font-medium">
              Credit: <strong className="ml-1 font-bold">{formatINR(summary.creditTotal)}</strong>
            </span>
          )}
        </div>

        {/* Mini share button */}
        {(summary.inTotal > 0 || summary.outTotal > 0) && (
          <button
            type="button"
            onClick={handleShare}
            className="p-1.5 text-iosBlue hover:bg-iosBlue/10 rounded-full active:scale-90 transition-all duration-150"
            title={t('share_btn', language)}
            aria-label={t('share_btn', language)}
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
