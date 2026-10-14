import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Smartphone, Wrench, Check, Search, Tag, ChevronDown } from 'lucide-react';
import { MasterDevice, MasterSparePart, SpareCategory } from '../../types/wholesale';

interface AddItemBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  devices: MasterDevice[];
  initialDevice?: MasterDevice;
  onSaveDevice: (device: Omit<MasterDevice, 'id'>) => Promise<MasterDevice>;
  onSaveSpare: (spare: Omit<MasterSparePart, 'id'>) => Promise<MasterSparePart>;
}

const POPULAR_BRANDS = [
  'Xiaomi',
  'Samsung',
  'Apple',
  'Realme',
  'Vivo',
  'Oppo',
  'OnePlus',
  'Motorola',
  'iQOO',
  'Poco',
  'Infinix',
  'Tecno',
  'Nothing',
  'Lenovo',
  'Google',
  'Other',
];

const PRESET_CATEGORIES: { id: SpareCategory; label: string }[] = [
  { id: 'display', label: 'Display Combo / Folder' },
  { id: 'battery', label: 'Battery' },
  { id: 'charging_board', label: 'Charging Sub-Board (CC Board)' },
  { id: 'back_panel', label: 'Back Panel / Door Glass' },
  { id: 'camera_glass', label: 'Camera Lens & Modules' },
  { id: 'flex', label: 'Flex Cable (Power / Volume / Main)' },
  { id: 'speaker', label: 'Speaker / Ringer' },
  { id: 'glass_oca', label: 'Touch Glass & OCA' },
  { id: 'sim_tray', label: 'SIM Tray' },
  { id: 'other', label: 'Other Spare / Accessory' },
];

export const AddItemBottomSheet: React.FC<AddItemBottomSheetProps> = ({
  isOpen,
  onClose,
  devices,
  initialDevice,
  onSaveDevice,
  onSaveSpare,
}) => {
  const [rendered, setRendered] = useState(isOpen);
  const [animate, setAnimate] = useState(false);

  // Active Mode: 'spare' or 'device'
  const [mode, setMode] = useState<'spare' | 'device'>('spare');

  // Spare Part Fields
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [deviceSearch, setDeviceSearch] = useState('');
  const [isNewModel, setIsNewModel] = useState(false);

  // Category Fields
  const [selectedCategory, setSelectedCategory] = useState<SpareCategory>('display');
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  // Part Specifics
  const [partName, setPartName] = useState('');
  const [partCode, setPartCode] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');

  // Device Specifics (used for both standalone device mode & inline new model)
  const [deviceBrand, setDeviceBrand] = useState('Xiaomi');
  const [customBrand, setCustomBrand] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [releaseYear, setReleaseYear] = useState('');

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  // Smooth open/close transitions
  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      const timer = setTimeout(() => setAnimate(true), 20);
      return () => clearTimeout(timer);
    } else {
      isSubmittingRef.current = false;
      setAnimate(false);
      const timer = setTimeout(() => setRendered(false), 220);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Prevent background scrolling when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setLoading(false);
      isSubmittingRef.current = false;
      if (initialDevice) {
        setSelectedDeviceId(initialDevice.id);
        setIsNewModel(false);
        setMode('spare');
      } else if (devices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(devices[0].id);
      }
    }
  }, [isOpen, initialDevice, devices]);

  // Filtered devices for model picker
  const filteredDevices = useMemo(() => {
    const q = deviceSearch.trim().toLowerCase();
    if (!q) return devices.slice(0, 30);
    return devices
      .filter((d) => d.model.toLowerCase().includes(q) || d.brand.toLowerCase().includes(q))
      .slice(0, 30);
  }, [devices, deviceSearch]);

  const selectedDevice = useMemo(() => {
    return devices.find((d) => d.id === selectedDeviceId) || initialDevice || devices[0];
  }, [devices, selectedDeviceId, initialDevice]);

  if (!rendered) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (isSubmittingRef.current || loading) return;
    isSubmittingRef.current = true;
    setError(null);
    setLoading(true);

    try {
      const finalBrand =
        (deviceBrand === 'Other' ? customBrand.trim() : deviceBrand.trim()) || 'Generic';

      if (mode === 'device') {
        // --- Standalone Phone Model Creation ---
        if (!deviceModel.trim()) {
          throw new Error('Please enter a phone model name');
        }
        await onSaveDevice({
          brand: finalBrand,
          model: deviceModel.trim(),
          releaseYear: releaseYear ? parseInt(releaseYear, 10) : undefined,
        });
        onClose();
        return;
      }

      // --- Spare Part Creation (with optional inline model creation) ---
      if (!partName.trim()) {
        throw new Error('Please enter a spare part name');
      }

      let targetDevice = selectedDevice;

      if (isNewModel) {
        if (!deviceModel.trim()) {
          throw new Error('Please enter the new phone model name');
        }
        // Create new device inline
        targetDevice = await onSaveDevice({
          brand: finalBrand,
          model: deviceModel.trim(),
          releaseYear: releaseYear ? parseInt(releaseYear, 10) : undefined,
        });
      }

      if (!targetDevice) {
        throw new Error('Please select or add a phone model');
      }

      // Resolve category
      let finalCategory: SpareCategory = selectedCategory;
      if (isNewCategory) {
        const trimmedCat = customCategory.trim();
        if (!trimmedCat) {
          throw new Error('Please enter a custom category name');
        }
        finalCategory = trimmedCat;
      }

      await onSaveSpare({
        deviceId: targetDevice.id,
        brand: targetDevice.brand,
        model: targetDevice.model,
        category: finalCategory,
        partName: partName.trim(),
        partCode: partCode.trim() || undefined,
        wholesalePrice: wholesalePrice ? parseFloat(wholesalePrice) : undefined,
        costPrice: costPrice ? parseFloat(costPrice) : undefined,
        compatibleModels: [targetDevice.model],
      });

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-[3px] transition-opacity duration-200 ease-out ${
          animate ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sheet Modal */}
      <div
        className={`relative z-10 w-full max-w-lg mx-auto max-h-[92vh] max-h-[92dvh] bg-white rounded-t-[20px] shadow-2xl flex flex-col overflow-hidden transition-transform duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${
          animate ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Drag handle */}
        <div className="pt-2 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-iosBlue/10 flex items-center justify-center text-iosBlue">
              {mode === 'spare' ? <Wrench className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-black tracking-tight">Add to Catalog</h2>
              <p className="text-[11px] text-[#8E8E93]">Manage parts and smartphone models</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-black hover:bg-[#F2F2F7] transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Segmented Mode Switch */}
        <div className="px-5 pt-3 pb-2 bg-slate-50/70 border-b border-slate-100">
          <div className="flex p-1 bg-[#E5E5EA] rounded-[10px]">
            <button
              type="button"
              onClick={() => {
                setMode('spare');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-[8px] transition-all flex items-center justify-center gap-1.5 ${
                mode === 'spare'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-iosBlue" />
              <span>Spare Part</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('device');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-[8px] transition-all flex items-center justify-center gap-1.5 ${
                mode === 'device'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-iosBlue" />
              <span>Phone Model</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-[10px] text-xs font-medium">
              {error}
            </div>
          )}

          {/* ===================== MODE: SPARE PART ===================== */}
          {mode === 'spare' && (
            <>
              {/* Phone Model Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                    Phone Model
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsNewModel((prev) => !prev)}
                    className="text-xs font-bold text-iosBlue hover:underline flex items-center gap-1"
                  >
                    <Plus className={`w-3 h-3 transition-transform ${isNewModel ? 'rotate-45' : ''}`} />
                    <span>{isNewModel ? 'Select Existing Model' : '+ New Model'}</span>
                  </button>
                </div>

                {isNewModel ? (
                  /* Inline New Model Inputs */
                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-[12px] space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-iosBlue">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Creating New Phone Model Inline</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                          Brand
                        </label>
                        <select
                          value={deviceBrand}
                          onChange={(e) => setDeviceBrand(e.target.value)}
                          className="w-full bg-white rounded-[9px] px-2.5 py-2 text-xs font-medium text-black border border-slate-200 focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
                        >
                          {POPULAR_BRANDS.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                          Release Year (Opt)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 2024"
                          value={releaseYear}
                          onChange={(e) => setReleaseYear(e.target.value)}
                          className="w-full bg-white rounded-[9px] px-2.5 py-2 text-xs font-medium text-black border border-slate-200 focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
                        />
                      </div>
                    </div>

                    {deviceBrand === 'Other' && (
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                          Custom Brand Name
                        </label>
                        <input
                          type="text"
                          placeholder="Brand name"
                          value={customBrand}
                          onChange={(e) => setCustomBrand(e.target.value)}
                          className="w-full bg-white rounded-[9px] px-2.5 py-2 text-xs font-medium text-black border border-slate-200 focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                        Model Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Redmi Note 13 Pro+ 5G"
                        value={deviceModel}
                        onChange={(e) => setDeviceModel(e.target.value)}
                        className="w-full bg-white rounded-[9px] px-2.5 py-2 text-xs font-medium text-black border border-slate-200 focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
                      />
                    </div>
                  </div>
                ) : (
                  /* Existing Model Selector with quick search */
                  <div className="space-y-1.5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filter phone models..."
                        value={deviceSearch}
                        onChange={(e) => setDeviceSearch(e.target.value)}
                        className="w-full bg-[#F2F2F7] pl-8 pr-3 py-1.5 rounded-[9px] text-xs font-medium text-black placeholder:text-slate-400 border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
                      />
                    </div>
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                      className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2.5 text-xs font-semibold text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
                    >
                      {filteredDevices.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.brand} {d.model} {d.releaseYear ? `(${d.releaseYear})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Category Section with Inline Toggle */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    Spare Category
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewCategory((prev) => !prev);
                      if (!isNewCategory && !customCategory) {
                        setCustomCategory('');
                      }
                    }}
                    className="text-xs font-bold text-iosBlue hover:underline flex items-center gap-1"
                  >
                    <Plus className={`w-3 h-3 transition-transform ${isNewCategory ? 'rotate-45' : ''}`} />
                    <span>{isNewCategory ? 'Select Preset Category' : '+ New Category'}</span>
                  </button>
                </div>

                {isNewCategory ? (
                  /* Custom Category Inline Input */
                  <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-[12px] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Custom Category Name</span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Housing Middle Frame, Mic Board, Vibrator"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full bg-white rounded-[9px] px-3 py-2 text-xs font-medium text-black border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      autoFocus
                    />
                    <p className="text-[10px] text-slate-500">
                      This custom category will be assigned to this spare part.
                    </p>
                  </div>
                ) : (
                  /* Preset Category Selector */
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as SpareCategory)}
                    className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2.5 text-xs font-semibold text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
                  >
                    {PRESET_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Part Specifics */}
              <div className="space-y-3 pt-1 border-t border-slate-100">
                <div>
                  <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider block mb-1">
                    Spare Part Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={partName}
                    onChange={(e) => setPartName(e.target.value)}
                    placeholder="e.g. Super AMOLED Display Combo (Original)"
                    className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2.5 text-xs font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider block mb-1">
                    Part Code / Model Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={partCode}
                    onChange={(e) => setPartCode(e.target.value)}
                    placeholder="e.g. BN53, CC-REDMI-10"
                    className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-xs font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider block mb-1">
                      Wholesale Price (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={wholesalePrice}
                      onChange={(e) => setWholesalePrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-xs font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider block mb-1">
                      Cost Price (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-xs font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ===================== MODE: PHONE MODEL ONLY ===================== */}
          {mode === 'device' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-[12px] flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-iosBlue shrink-0" />
                <p className="text-xs text-slate-600">
                  Register a smartphone or tablet model into your master spares catalog.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider block mb-1">
                  Brand <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={deviceBrand}
                    onChange={(e) => setDeviceBrand(e.target.value)}
                    className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2.5 text-xs font-semibold text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40 appearance-none"
                  >
                    {POPULAR_BRANDS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {deviceBrand === 'Other' && (
                <div>
                  <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider block mb-1">
                    Custom Brand Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customBrand}
                    onChange={(e) => setCustomBrand(e.target.value)}
                    placeholder="Enter brand name"
                    className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2.5 text-xs font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider block mb-1">
                  Model Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  placeholder="e.g. Redmi Note 13 Pro+ 5G"
                  autoFocus
                  className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2.5 text-xs font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider block mb-1">
                  Release Year (Optional)
                </label>
                <input
                  type="number"
                  value={releaseYear}
                  onChange={(e) => setReleaseYear(e.target.value)}
                  placeholder="e.g. 2024"
                  className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2.5 text-xs font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
                />
              </div>
            </div>
          )}

          {/* Safe-Area Footnote Padding Anchor */}
          <div className="h-2" />
        </form>

        {/* Action Button Footer with Mobile Safe Area Clearance */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-3 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:pb-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-[12px] bg-[#F2F2F7] text-slate-700 text-xs font-bold hover:bg-slate-200 transition-all active:scale-98"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-2 py-2.5 rounded-[12px] bg-iosBlue text-white text-xs font-bold hover:bg-blue-600 transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50"
          >
            {loading ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{mode === 'spare' ? 'Add Spare Part' : 'Add Phone Model'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
