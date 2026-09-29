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
      <div className="grid grid-cols-3 gap-2 text-center pb-3 border-b border-[#E5E5EA]">
        {/* IN */}
        <div className="flex flex-col items-center">
          <div className="flex items-center text-xs font-semibold text-[#8E8E93] mb-0.5">
            <ArrowDownLeft className="w-3.5 h-3.5 text-iosGreen mr-0.5" />
            <span>{t('summary_in', language)}</span>
          </div>
          <span className="text-[17px] font-bold text-iosGreen tracking-tight">
            {formatINR(summary.inTotal)}
          </span>
          <span className="text-[10px] text-[#8E8E93]">
            {summary.inCount} {t('items_unit', language)}
          </span>
        </div>

        {/* OUT */}
        <div className="flex flex-col items-center border-x border-[#E5E5EA]">
          <div className="flex items-center text-xs font-semibold text-[#8E8E93] mb-0.5">
            <ArrowUpRight className="w-3.5 h-3.5 text-iosRed mr-0.5" />
            <span>{t('summary_out', language)}</span>
          </div>
          <span className="text-[17px] font-bold text-iosRed tracking-tight">
            {formatINR(summary.outTotal)}
          </span>
        </div>

        {/* NET */}
        <div className="flex flex-col items-center">
          <div className="flex items-center text-xs font-semibold text-[#8E8E93] mb-0.5">
            <span>{t('summary_net', language)}</span>
          </div>
          <span
            className={`text-[17px] font-bold tracking-tight ${
              summary.net >= 0 ? 'text-black' : 'text-iosRed'
            }`}
          >
            {formatINR(summary.net)}
          </span>
        </div>
      </div>

      {/* Cash / UPI / Card breakdown row */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 text-[11px] text-[#8E8E93]">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 font-medium">
            Cash: <strong className="ml-1 text-black font-semibold">{formatINR(summary.cashTotal)}</strong>
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-iosBlue font-medium">
            UPI: <strong className="ml-1 font-semibold">{formatINR(summary.upiTotal)}</strong>
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-medium">
            Card: <strong className="ml-1 font-semibold">{formatINR(summary.cardTotal)}</strong>
          </span>
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
