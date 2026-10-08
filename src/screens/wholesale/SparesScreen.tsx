import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Cpu,
  Smartphone,
  Tag,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { Language } from '../../types';
import { MasterDevice, MasterSparePart } from '../../types/wholesale';
import {
  fetchMasterDevices,
  fetchMasterSpares,
  addCustomDevice,
  addCustomSparePart,
  updatePartCompatibility,
} from '../../firebase/masterSpares';
import { AddDeviceModal } from '../../components/wholesale/AddDeviceModal';
import { AddSparePartModal } from '../../components/wholesale/AddSparePartModal';
import { PartCompatibilityModal } from '../../components/wholesale/PartCompatibilityModal';

export interface SparesScreenProps {
  language?: Language;
  shopName?: string;
  isReadOnly?: boolean;
  isActivated?: boolean;
}

const BRANDS = [
  'All',
  'Redmi',
  'Poco',
  'Xiaomi',
  'Samsung',
  'Vivo',
  'Realme',
  'Oppo',
  'OnePlus',
  'Apple',
  'Motorola',
  'Infinix',
  'Tecno',
  'iQOO',
  'Nothing',
];

const PAGE_SIZE = 30;

export const SparesScreen: React.FC<SparesScreenProps> = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [devices, setDevices] = useState<MasterDevice[]>([]);
  const [spares, setSpares] = useState<MasterSparePart[]>([]);
  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [isAddSpareOpen, setIsAddSpareOpen] = useState(false);
  const [selectedDeviceForPart, setSelectedDeviceForPart] = useState<MasterDevice | undefined>();
  const [compatPart, setCompatPart] = useState<MasterSparePart | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [devList, spareList] = await Promise.all([
          fetchMasterDevices(),
          fetchMasterSpares(),
        ]);
        if (mounted) {
          setDevices(devList);
          setSpares(spareList);
          if (devList.length > 0) {
            setExpandedDeviceId(devList[0].id);
          }
        }
      } catch (err) {
        console.warn('Failed to load spares catalog:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  // Reset pagination when filter or search changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedBrand, searchQuery]);

  // Filter devices based on brand & search
  const filteredDevices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return devices.filter((d) => {
      const brandMatch = selectedBrand === 'All' || d.brand.toLowerCase() === selectedBrand.toLowerCase();
      if (!brandMatch) return false;
      if (!q) return true;

      const deviceMatch =
        d.model.toLowerCase().includes(q) ||
        d.brand.toLowerCase().includes(q) ||
        ('modelCodes' in d &&
          Array.isArray((d as { modelCodes?: string[] }).modelCodes) &&
          (d as { modelCodes?: string[] }).modelCodes?.some((code) => code.toLowerCase().includes(q)));

      const partsMatch = spares.some(
        (s) =>
          s.deviceId === d.id &&
          (s.partName.toLowerCase().includes(q) ||
            (s.partCode && s.partCode.toLowerCase().includes(q)) ||
            s.compatibleModels?.some((m) => m.toLowerCase().includes(q)))
      );
      return deviceMatch || partsMatch;
    });
  }, [devices, spares, selectedBrand, searchQuery]);

  const visibleDevices = useMemo(() => {
    return filteredDevices.slice(0, visibleCount);
  }, [filteredDevices, visibleCount]);

  const handleSaveDevice = async (newDeviceData: Omit<MasterDevice, 'id'>) => {
    const created = await addCustomDevice(newDeviceData);
    setDevices((prev) => [created, ...prev]);
    setExpandedDeviceId(created.id);
  };

  const handleSaveSpare = async (newSpareData: Omit<MasterSparePart, 'id'>) => {
    const created = await addCustomSparePart(newSpareData);
    setSpares((prev) => [created, ...prev]);
  };

  const handleSaveCompatibility = async (partId: string, models: string[]) => {
    await updatePartCompatibility(partId, models);
    setSpares((prev) =>
      prev.map((s) => (s.id === partId ? { ...s, compatibleModels: models } : s))
    );
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-lg mx-auto space-y-4">
      {/* Header & Quick Action Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-black tracking-tight flex items-center gap-2">
            <Cpu className="w-5 h-5 text-iosBlue" />
            Spares Catalog
          </h1>
          <p className="text-xs text-[#8E8E93] mt-0.5">
            {devices.length > 0
              ? `${devices.length.toLocaleString()} models • ${spares.length.toLocaleString()}+ parts`
              : 'Pre-loaded smartphone models & spare parts'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsAddDeviceOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-semibold rounded-full shadow-2xs active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-iosBlue" />
            <span>+ Add Phone Model</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedDeviceForPart(undefined);
              setIsAddSpareOpen(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-iosBlue hover:bg-blue-600 text-white text-xs font-bold rounded-full shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Spare Part</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search phone model or spare part..."
          className="w-full bg-white pl-10 pr-4 py-2.5 rounded-[12px] text-sm font-medium text-black placeholder:text-slate-400 border border-black/[0.06] shadow-2xs focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
        />
      </div>

      {/* Brand Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
        {BRANDS.map((b) => {
          const isSelected = selectedBrand.toLowerCase() === b.toLowerCase();
          return (
            <button
              key={b}
              type="button"
              onClick={() => setSelectedBrand(b)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              {b}
            </button>
          );
        })}
      </div>

      {/* Model Cards & Spares Accordion */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading catalog...</div>
      ) : filteredDevices.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          No matching phone models found.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleDevices.map((device) => {
            const isExpanded = expandedDeviceId === device.id;
            const deviceSpares = spares.filter((s) => s.deviceId === device.id);

            return (
              <div
                key={device.id}
                className="bg-white rounded-[14px] border border-black/[0.05] shadow-xs overflow-hidden transition-all"
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => setExpandedDeviceId(isExpanded ? null : device.id)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-black/[0.04] flex items-center justify-center shrink-0 overflow-hidden">
                      {device.photoUrl ? (
                        <img
                          src={device.photoUrl}
                          alt={device.model}
                          className="w-full h-full object-contain p-0.5"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Smartphone className="w-5 h-5 text-iosBlue" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {device.brand}
                        </span>
                        {device.releaseYear && (
                          <span className="text-[10px] font-semibold text-slate-400">
                            • {device.releaseYear}
                          </span>
                        )}
                      </div>
                      <h2 className="text-sm font-bold text-black truncate">{device.model}</h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold text-slate-500 bg-[#F2F2F7] px-2 py-0.5 rounded-full">
                      {deviceSpares.length} parts
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Spares List */}
                {isExpanded && (
                  <div className="px-4 pb-3 pt-1 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Available Replacement Parts
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDeviceForPart(device);
                          setIsAddSpareOpen(true);
                        }}
                        className="text-[11px] font-bold text-iosBlue hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Part for {device.model}
                      </button>
                    </div>

                    {deviceSpares.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">
                        No parts added for this model yet. Tap above to add one.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {deviceSpares.map((part) => (
                          <div
                            key={part.id}
                            className="p-3 bg-[#F9F9FB] rounded-[10px] border border-black/[0.03] space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-xs font-bold text-slate-900 block">
                                  {part.partName}
                                </span>
                                {part.partCode && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-iosBlue mt-0.5">
                                    <Zap className="w-3 h-3" />
                                    OEM Code: {part.partCode}
                                  </span>
                                )}
                              </div>
                              {part.wholesalePrice && (
                                <span className="text-xs font-bold text-iosGreen shrink-0 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                  ₹{part.wholesalePrice}
                                </span>
                              )}
                            </div>

                            {/* Cross-Model Compatibility tags */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                                <Tag className="w-2.5 h-2.5" /> Fits:
                              </span>
                              {part.compatibleModels?.map((m) => (
                                <span
                                  key={m}
                                  className="text-[10px] font-medium bg-white text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
                                >
                                  {m}
                                </span>
                              ))}
                              <button
                                type="button"
                                onClick={() => setCompatPart(part)}
                                className="text-[10px] font-bold text-iosBlue hover:underline ml-1"
                              >
                                + Edit
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Show More Pagination Button */}
          {filteredDevices.length > visibleCount && (
            <div className="pt-2 pb-4 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="px-5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-full hover:bg-slate-50 active:scale-95 transition-all shadow-2xs"
              >
                Show More Models ({visibleCount} of {filteredDevices.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddDeviceModal
        isOpen={isAddDeviceOpen}
        onClose={() => setIsAddDeviceOpen(false)}
        onSave={handleSaveDevice}
      />

      <AddSparePartModal
        isOpen={isAddSpareOpen}
        devices={devices}
        selectedDevice={selectedDeviceForPart}
        onClose={() => setIsAddSpareOpen(false)}
        onSave={handleSaveSpare}
      />

      <PartCompatibilityModal
        isOpen={Boolean(compatPart)}
        part={compatPart}
        onClose={() => setCompatPart(null)}
        onSave={handleSaveCompatibility}
      />
    </div>
  );
};
