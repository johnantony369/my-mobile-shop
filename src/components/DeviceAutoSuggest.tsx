import React, { useState, useEffect, useRef } from 'react';
import { MasterDevice } from '../types/wholesale';
import { searchMasterDevices } from '../firebase/masterSpares';
import { Smartphone, X } from 'lucide-react';

interface DeviceAutoSuggestProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export const DeviceAutoSuggest: React.FC<DeviceAutoSuggestProps> = ({
  value,
  onChange,
  placeholder = 'Search device model (e.g. Redmi Note 10 Pro, iPhone 13)...',
  required = false,
  disabled = false,
}) => {
  const [suggestions, setSuggestions] = useState<MasterDevice[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      searchMasterDevices(q).then((results) => {
        if (active) {
          // Exclude exact match if already chosen
          setSuggestions(results.slice(0, 8));
          setIsOpen(results.length > 0);
        }
      });
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [value]);

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

  const handleSelect = (device: MasterDevice) => {
    // If model already contains brand (e.g. "iPhone 13" or "Redmi Note 10"), use model; otherwise combine brand + model
    const fullModel = device.model.toLowerCase().startsWith(device.brand.toLowerCase())
      ? device.model
      : `${device.brand} ${device.model}`;
    onChange(fullModel);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-[15px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
            aria-label="Clear device model"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-[12px] shadow-lg border border-black/[0.08] overflow-hidden divide-y divide-black/[0.04] max-h-60 overflow-y-auto animate-fade-in">
          <div className="px-3 py-1.5 bg-slate-50 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Smartphone className="w-3 h-3 text-iosBlue" />
              <span>Database Models ({suggestions.length})</span>
            </span>
            <span className="text-[9px] font-normal lowercase text-slate-400">tap to select</span>
          </div>
          {suggestions.map((device) => {
            const displayName = device.model.toLowerCase().startsWith(device.brand.toLowerCase())
              ? device.model
              : `${device.brand} ${device.model}`;

            return (
              <button
                key={device.id}
                type="button"
                onClick={() => handleSelect(device)}
                className="w-full px-3.5 py-2 text-left hover:bg-blue-50/60 active:bg-blue-100 flex items-center justify-between gap-2 transition-colors"
              >
                <div className="min-w-0">
                  <span className="text-xs font-bold text-black block truncate">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {device.brand} {device.releaseYear ? `• ${device.releaseYear}` : ''}
                  </span>
                </div>
                <span className="text-[11px] text-iosBlue font-semibold shrink-0">
                  Select
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
