import React, { useState, useEffect, useRef } from 'react';
import { MasterSparePart } from '../../types/wholesale';
import { searchMasterSpares } from '../../firebase/masterSpares';
import { X, Cpu, Zap } from 'lucide-react';

interface SparesAutoSuggestProps {
  value: string;
  onChange: (val: string) => void;
  onSelectPart: (part: MasterSparePart) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const SparesAutoSuggest: React.FC<SparesAutoSuggestProps> = ({
  value,
  onChange,
  onSelectPart,
  placeholder = 'Enter item or select spare part...',
  disabled = false,
}) => {
  const [suggestions, setSuggestions] = useState<MasterSparePart[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const q = value.trim();
    if (q.length >= 2) {
      searchMasterSpares(q).then((results) => {
        if (active) {
          setSuggestions(results.slice(0, 6));
          setIsOpen(results.length > 0);
        }
      });
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
    return () => {
      active = false;
    };
  }, [value]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleSelect = (part: MasterSparePart) => {
    const label = `${part.model} • ${part.partName}`;
    onChange(label);
    onSelectPart(part);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-[15px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-[12px] shadow-lg border border-black/[0.08] overflow-hidden divide-y divide-black/[0.04] max-h-60 overflow-y-auto animate-fade-in">
          <div className="px-3 py-1.5 bg-slate-50 flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <Cpu className="w-3 h-3 text-iosBlue" />
            <span>Spares Catalog Suggestions</span>
          </div>
          {suggestions.map((part) => (
            <button
              key={part.id}
              type="button"
              onClick={() => handleSelect(part)}
              className="w-full px-3.5 py-2.5 text-left hover:bg-blue-50/60 active:bg-blue-100 flex items-center justify-between gap-2 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-black truncate">{part.model}</span>
                  <span className="text-[11px] text-slate-500">• {part.partName}</span>
                </div>
                {part.partCode && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-iosBlue mt-0.5">
                    <Zap className="w-2.5 h-2.5" /> Code: {part.partCode}
                  </span>
                )}
              </div>
              {part.wholesalePrice && (
                <span className="text-xs font-bold text-iosGreen shrink-0 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                  ₹{part.wholesalePrice}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
