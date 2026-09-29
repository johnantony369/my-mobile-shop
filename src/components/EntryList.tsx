import React from 'react';
import { Entry, Language } from '../types';
import { formatINR, t } from '../i18n';
import { formatTime } from '../utils/date';
import { SwipeableRow } from './SwipeableRow';
import { PlusCircle, ShoppingBag, ArrowUpRight } from 'lucide-react';

interface EntryListProps {
  entries: Entry[];
  isToday: boolean;
  language: Language;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onAddClick: () => void;
}

export const EntryList: React.FC<EntryListProps> = ({
  entries,
  isToday,
  language,
  onEdit,
  onDelete,
  onAddClick,
}) => {
  if (entries.length === 0) {
    return (
      <div className="mx-4 my-6 bg-white rounded-[14px] p-8 text-center shadow-sm border border-black/[0.04]">
        <div className="w-14 h-14 bg-blue-50 text-iosBlue rounded-full flex items-center justify-center mx-auto mb-3">
          <ShoppingBag className="w-7 h-7" />
        </div>
        <h3 className="text-[17px] font-semibold text-black">
          {isToday ? t('empty_today', language) : t('empty_day', language)}
        </h3>
        <p className="text-[13px] text-[#8E8E93] mt-1.5 max-w-[260px] mx-auto leading-relaxed">
          {isToday ? t('empty_today_hint', language) : t('empty_day_hint', language)}
        </p>
        <button
          type="button"
          onClick={onAddClick}
          className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 bg-iosBlue text-white text-sm font-semibold rounded-full shadow-sm active:opacity-80 transition-opacity"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('add_entry', language)}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-20 bg-white rounded-[14px] shadow-sm border border-black/[0.04] overflow-hidden">
      {entries.map((entry, index) => {
        const isExpense = entry.type === 'out';
        const title =
          entry.item?.trim() ||
          entry.customerName?.trim() ||
          (isExpense ? t('fallback_expense', language) : t('fallback_sale', language));

        const subtitleParts: string[] = [];
        if (entry.item && entry.customerName) {
          subtitleParts.push(entry.customerName);
        }
        if (entry.note) {
          subtitleParts.push(entry.note);
        }

        return (
          <div
            key={entry.id ?? index}
            className={`${index !== 0 ? 'border-t border-[#E5E5EA]' : ''}`}
          >
            <SwipeableRow
              onEdit={() => onEdit(entry)}
              onDelete={() => onDelete(entry)}
              onTap={() => onEdit(entry)}
              editLabel={t('edit_action', language)}
              deleteLabel={t('delete_action', language)}
            >
              <div className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-black/[0.015] active:bg-black/[0.04] transition-colors">
                {/* Left side details */}
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-[15px] font-medium text-black truncate">
                      {title}
                    </span>
                    {/* Method Badge & Repair Badge */}
                    {!isExpense ? (
                      <div className="flex items-center space-x-1">
                        {entry.repairId && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">
                            {t('repair_badge', language)}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            entry.paymentMethod === 'upi'
                              ? 'bg-blue-50 text-iosBlue'
                              : entry.paymentMethod === 'card'
                              ? 'bg-purple-50 text-purple-600'
                              : 'bg-gray-100 text-[#8E8E93]'
                          }`}
                        >
                          {entry.paymentMethod || 'cash'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-iosRed flex items-center">
                        <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />
                        {t('summary_out', language)}
                      </span>
                    )}
                  </div>

                  {/* Subtitle / time / note */}
                  <div className="flex items-center space-x-2 mt-0.5 text-xs text-[#8E8E93] truncate">
                    <span>{formatTime(entry.createdAt)}</span>
                    {subtitleParts.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="truncate">{subtitleParts.join(' • ')}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right side amount */}
                <div className="text-right flex-shrink-0">
                  <span
                    className={`text-[17px] font-bold tracking-tight ${
                      isExpense ? 'text-iosRed' : 'text-iosGreen'
                    }`}
                  >
                    {isExpense ? '-' : '+'}
                    {formatINR(entry.amount)}
                  </span>
                </div>
              </div>
            </SwipeableRow>
          </div>
        );
      })}
    </div>
  );
};
