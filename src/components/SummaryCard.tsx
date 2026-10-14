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
      {/* Top Hero Section: NET BALANCE (centered) */}
      <div className="text-center flex flex-col items-center justify-center pb-3.5 border-b border-[#E5E5EA]">
        <span className="text-xs font-semibold text-[#8E8E93] mb-0.5">
          {t('summary_net', language)}
        </span>
        <span
          className={`text-[32px] sm:text-[36px] font-black tabular-nums leading-none truncate max-w-full px-1 ${
            summary.net >= 0 ? 'text-black' : 'text-iosRed'
          }`}
        >
          {formatINR(summary.net)}
        </span>
      </div>

      {/* Middle Section: IN & OUT side-by-side in balanced 2-column grid */}
      <div className="grid grid-cols-2 gap-3 text-center py-3 border-b border-[#E5E5EA]">
        {/* IN */}
        <div className="flex flex-col items-center justify-between pr-2 border-r border-[#E5E5EA]">
          <div className="flex items-center text-xs font-semibold text-[#8E8E93] mb-1">
            <ArrowDownLeft className="size-3.5 text-iosGreen mr-0.5" />
            <span>{t('summary_in', language)}</span>
          </div>
          <span className="text-[20px] sm:text-[24px] font-bold text-iosGreen tabular-nums leading-tight truncate max-w-full px-0.5">
            {formatINR(summary.inTotal)}
          </span>
          <span className="text-[11px] text-[#8E8E93] mt-1 font-medium">
            {summary.inCount} {t('items_unit', language)}
          </span>
        </div>

        {/* OUT */}
        <div className="flex flex-col items-center justify-between pl-2">
          <div className="flex items-center text-xs font-semibold text-[#8E8E93] mb-1">
            <ArrowUpRight className="size-3.5 text-iosRed mr-0.5" />
            <span>{t('summary_out', language)}</span>
          </div>
          <span className="text-[20px] sm:text-[24px] font-bold text-iosRed tabular-nums leading-tight truncate max-w-full px-0.5">
            {formatINR(summary.outTotal)}
          </span>
          <span className="text-[11px] text-[#8E8E93] mt-1 font-medium">
            {summary.outTotal > 0 ? t('fallback_expense', language) : '—'}
          </span>
        </div>
      </div>

      {/* Bottom Section: Cash / UPI / Card / Credit breakdown in one line (wrapping only if big numbers) + Share at bottom right */}
      <div className="pt-3 flex items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-[12px] text-[#8E8E93] min-w-0">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-black/[0.04] text-[#8E8E93] font-medium whitespace-nowrap">
            Cash: <strong className="ml-1 text-black font-bold tabular-nums">{formatINR(summary.cashTotal)}</strong>
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50/80 text-iosBlue border border-blue-100/60 font-medium whitespace-nowrap">
            UPI: <strong className="ml-1 font-bold tabular-nums">{formatINR(summary.upiTotal)}</strong>
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50/80 text-purple-700 border border-purple-100/60 font-medium whitespace-nowrap">
            Card: <strong className="ml-1 font-bold tabular-nums">{formatINR(summary.cardTotal)}</strong>
          </span>
          {summary.creditTotal > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/80 font-medium whitespace-nowrap">
              Credit: <strong className="ml-1 font-bold tabular-nums">{formatINR(summary.creditTotal)}</strong>
            </span>
          )}
        </div>

        {/* Share button at bottom right */}
        {(summary.inTotal > 0 || summary.outTotal > 0) && (
          <button
            type="button"
            onClick={handleShare}
            className="size-8 flex items-center justify-center text-iosBlue hover:bg-iosBlue/10 rounded-full active:scale-95 transition-transform duration-150 shrink-0 self-end mb-0.5 sm:self-center sm:mb-0"
            title={t('share_btn', language)}
            aria-label={t('share_btn', language)}
          >
            <Share2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
};
