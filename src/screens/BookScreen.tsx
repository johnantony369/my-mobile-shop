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
import { Plus, Calendar } from 'lucide-react';

interface BookScreenProps {
  language: Language;
  shopName: string;
  isReadOnly: boolean;
}

export const BookScreen: React.FC<BookScreenProps> = ({
  language,
  shopName,
  isReadOnly,
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
            className={`text-[17px] font-semibold text-black transition-opacity duration-200 ${
              isScrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {dateTitle}
          </span>
          {isScrolled && (
            <span className="text-xs text-[#8E8E93] font-medium truncate max-w-[120px]">
              {shopName}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        {/* Large Title Header */}
        <div className="px-4 pt-2 pb-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-iosBlue uppercase tracking-wider">
              {shopName || 'My Mobile Shop'}
            </span>
            <div className="flex items-center space-x-1 text-xs text-[#8E8E93]">
              <Calendar className="w-3.5 h-3.5" />
              <span>{selectedDate}</span>
            </div>
          </div>
          <h1 className="text-[32px] font-extrabold text-black tracking-tight mt-0.5">
            {dateTitle}
          </h1>
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
          onClick={handleOpenAdd}
          aria-label={t('add_entry', language)}
          className={`h-13 px-5 py-3 rounded-full flex items-center space-x-2 font-bold text-[15px] shadow-lg active:scale-95 transition-all duration-150 ${
            isReadOnly
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-iosBlue text-white shadow-iosBlue/35 hover:bg-blue-600'
          }`}
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>{t('add_entry', language)}</span>
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
