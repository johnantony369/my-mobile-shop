import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, computeSummary } from '../db/db';
import { Entry, Language } from '../types';
import { getLocalDateString, formatHeaderDate } from '../utils/date';
import { t } from '../i18n';
import { DateStrip } from '../components/DateStrip';
import { SummaryCard } from '../components/SummaryCard';
import { DailyRitualCard } from '../components/DailyRitualCard';
import { EntryList } from '../components/EntryList';
import { ConfirmModal } from '../components/ConfirmModal';
import { AddEditSheet } from './AddEditSheet';
import { Plus, Crown } from 'lucide-react';

interface BookScreenProps {
  language: Language;
  shopName: string;
  isReadOnly: boolean;
  isActivated?: boolean;
  trialDays?: number;
  onOpenPaywall?: () => void;
}

export const BookScreen: React.FC<BookScreenProps> = ({
  language,
  shopName,
  isReadOnly,
  isActivated,
  trialDays,
  onOpenPaywall,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<Entry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);

  // Live query for the selected date's entries from IndexedDB
  const entries = useLiveQuery(
    () => db.entries.where('date').equals(selectedDate).toArray(),
    [selectedDate]
  ) ?? [];

  // Sort chronologically (oldest first or newest first: chronological means earliest first)
  const sortedEntries = [...entries].sort((a, b) => a.createdAt - b.createdAt);
  const summary = computeSummary(sortedEntries);

  const isToday = selectedDate === getLocalDateString();
  const dateTitle = formatHeaderDate(selectedDate, language);

  // Scroll listener for large title collapse effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleOpenAdd = () => {
    setEntryToEdit(null);
    setIsAddSheetOpen(true);
  };

  const handleOpenEdit = (entry: Entry) => {
    setEntryToEdit(entry);
    setIsAddSheetOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (entryToDelete && entryToDelete.id) {
      await db.entries.delete(entryToDelete.id);
      setEntryToDelete(null);
    }
  };

  return (
    <div className="min-h-screen pb-28">
      {/* Sticky top navigation bar for collapsed title */}
      <div
        className={`sticky top-0 z-30 transition-all duration-200 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-[#E5E5EA] py-2.5'
            : 'bg-transparent py-1'
        }`}
      >
        <div className="max-w-lg mx-auto px-4 flex items-center justify-between">
          <span
            className={`text-[17px] font-bold text-black transition-opacity duration-200 ${
              isScrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {shopName || 'My Mobile Shop'}
          </span>
          {isScrolled && (
            <div className="flex items-center space-x-2">
              {!isActivated && onOpenPaywall && (
                <button
                  type="button"
                  onClick={onOpenPaywall}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs active:scale-95 transition-all"
                >
                  <Crown className="w-3 h-3 text-yellow-200" />
                  <span>PRO</span>
                </button>
              )}
              <span className="text-xs text-iosBlue font-semibold truncate max-w-[130px]">
                {dateTitle}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        {/* Large Shop Name & Action Header */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-[28px] sm:text-[30px] font-black text-black tracking-tight leading-tight truncate flex-1 min-w-0">
              {shopName || 'My Mobile Shop'}
            </h1>
            {!isActivated && onOpenPaywall && (
              <button
                type="button"
                onClick={onOpenPaywall}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-all shadow-xs border ${
                  isReadOnly
                    ? 'bg-red-50 text-iosRed border-red-200 animate-pulse'
                    : 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-900 border-amber-200/90 hover:from-amber-100 hover:to-yellow-100'
                }`}
              >
                <Crown className={`w-3.5 h-3.5 ${isReadOnly ? 'text-iosRed' : 'text-amber-600'}`} />
                <span>
                  {isReadOnly
                    ? 'Unlock Pro'
                    : `Pro: ${trialDays ?? 0}d left`}
                </span>
              </button>
            )}
          </div>
          <p className="text-[16px] font-bold text-iosBlue tracking-tight mt-0.5">
            {dateTitle}
          </p>
        </div>

        {/* Swipeable Date Strip (Last 14 days) */}
        <div className="my-1">
          <DateStrip
            selectedDate={selectedDate}
            onSelectDate={(d) => setSelectedDate(d)}
            language={language}
          />
        </div>

        {/* Daily Ritual Card (Yesterday's summary banner on first open of day) */}
        <DailyRitualCard language={language} shopName={shopName} />

        {/* Summary Card for Selected Day */}
        <SummaryCard
          summary={summary}
          dateDisplay={dateTitle}
          shopName={shopName}
          language={language}
        />

        {/* Chronological List of Entries with Swipe-to-Action */}
        <EntryList
          entries={sortedEntries}
          isToday={isToday}
          language={language}
          onEdit={handleOpenEdit}
          onDelete={(entry) => setEntryToDelete(entry)}
          onAddClick={handleOpenAdd}
        />
      </div>

      {/* Prominent iOS-style "+ Add" button fixed above the bottom tab bar */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+66px)] right-5 z-30">
        <button
          type="button"
          onClick={() => {
            if (isReadOnly && onOpenPaywall) {
              onOpenPaywall();
            } else {
              handleOpenAdd();
            }
          }}
          aria-label={isReadOnly ? 'Unlock Pro to Add' : t('add_entry', language)}
          className={`h-13 px-5 py-3 rounded-full flex items-center space-x-2 font-bold text-[15px] shadow-lg active:scale-95 transition-all duration-150 ${
            isReadOnly
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/35'
              : 'bg-iosBlue text-white shadow-iosBlue/35 hover:bg-blue-600'
          }`}
        >
          {isReadOnly ? (
            <>
              <Crown className="w-5 h-5 text-yellow-200" />
              <span>Unlock Pro to Add</span>
            </>
          ) : (
            <>
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>{t('add_entry', language)}</span>
            </>
          )}
        </button>
      </div>

      {/* Add / Edit Sheet */}
      <AddEditSheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        onSaved={() => {}}
        entryToEdit={entryToEdit}
        defaultDate={selectedDate}
        language={language}
        isReadOnly={isReadOnly}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!entryToDelete}
        title={t('delete_title', language)}
        message={t('delete_message', language)}
        confirmLabel={t('delete_action', language)}
        cancelLabel={t('cancel_action', language)}
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setEntryToDelete(null)}
      />
    </div>
  );
};
