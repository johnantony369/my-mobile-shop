import React, { useRef, useEffect } from 'react';
import { getLast14Days } from '../utils/date';
import { Language } from '../types';

interface DateStripProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  language: Language;
}

export const DateStrip: React.FC<DateStripProps> = ({
  selectedDate,
  onSelectDate,
  language,
}) => {
  const days = getLast14Days();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll right to show the most recent days (including today) on initial load
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, []);

  return (
    <div
      ref={scrollContainerRef}
      className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-2 px-4 scroll-smooth"
    >
      {days.map((item) => {
        const isSelected = item.dateStr === selectedDate;
        const dayLabel = language === 'ml' ? item.dayNameMl : item.dayNameEn;

        return (
          <button
            key={item.dateStr}
            type="button"
            onClick={() => onSelectDate(item.dateStr)}
            className={`flex-shrink-0 flex flex-col items-center justify-center w-[52px] h-[66px] rounded-[12px] transition-all duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] active:scale-95 ${
              isSelected
                ? 'bg-iosBlue text-white shadow-md font-semibold scale-105'
                : 'bg-white text-iosLabel shadow-sm border border-black/[0.04] active:bg-[#E5E5EA] hover:border-black/[0.08]'
            }`}
          >
            <span
              className={`text-[11px] font-medium tracking-tight uppercase ${
                isSelected ? 'text-white/90' : 'text-[#8E8E93]'
              }`}
            >
              {item.isToday ? (language === 'ml' ? 'ഇന്ന്' : 'Today') : dayLabel}
            </span>
            <span className={`text-[19px] mt-0.5 leading-none font-bold`}>
              {item.dayNum}
            </span>
            {item.isToday && (
              <span
                className={`w-1 h-1 rounded-full mt-1.5 ${
                  isSelected ? 'bg-white' : 'bg-iosBlue'
                }`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
