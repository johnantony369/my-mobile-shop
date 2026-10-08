import React, { useState } from 'react';
import { X, Wrench } from 'lucide-react';
import { MasterDevice, MasterSparePart, SpareCategory } from '../../types/wholesale';

interface AddSparePartModalProps {
  isOpen: boolean;
  devices: MasterDevice[];
  selectedDevice?: MasterDevice;
  onClose: () => void;
  onSave: (spare: Omit<MasterSparePart, 'id'>) => Promise<void>;
}

export const AddSparePartModal: React.FC<AddSparePartModalProps> = ({
  isOpen,
  devices,
  selectedDevice,
  onClose,
  onSave,
}) => {
  const [deviceId, setDeviceId] = useState(selectedDevice?.id || devices[0]?.id || '');
  const [category, setCategory] = useState<SpareCategory>('display');
  const [partName, setPartName] = useState('');
  const [partCode, setPartCode] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentDevice = devices.find((d) => d.id === deviceId) || selectedDevice || devices[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partName.trim()) {
      setError('Please enter a spare part name');
      return;
    }
    if (!currentDevice) {
      setError('Please select a valid phone model');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await onSave({
        deviceId: currentDevice.id,
        brand: currentDevice.brand,
        model: currentDevice.model,
        category,
        partName: partName.trim(),
        partCode: partCode.trim() || undefined,
        wholesalePrice: wholesalePrice ? parseFloat(wholesalePrice) : undefined,
        costPrice: costPrice ? parseFloat(costPrice) : undefined,
        compatibleModels: [currentDevice.model],
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add spare part');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-[16px] w-full max-w-sm p-5 shadow-xl border border-black/[0.06] space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-iosBlue" />
            <h2 className="text-base font-bold text-black tracking-tight">Add Spare Part</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-black hover:bg-[#F2F2F7] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <div>
            <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1">
              Phone Model
            </label>
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-sm font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.brand} {d.model}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1">
              Part Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SpareCategory)}
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-sm font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
            >
              <option value="display">Display Combo / Folder</option>
              <option value="battery">Battery</option>
              <option value="charging_board">Charging Sub-Board (CC Board)</option>
              <option value="back_panel">Back Panel / Door Glass</option>
              <option value="camera_glass">Camera Lens &amp; Modules</option>
              <option value="flex">Flex Cable (Volume / Power)</option>
              <option value="speaker">Speaker / Ringer</option>
              <option value="glass_oca">Touch Glass &amp; OCA</option>
              <option value="sim_tray">SIM Tray</option>
              <option value="other">Other Spare / Accessory</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1">
              Spare Part Name
            </label>
            <input
              type="text"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              placeholder="Enter spare part name"
              autoFocus
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-sm font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1">
              Part Code / Battery No. (Optional)
            </label>
            <input
              type="text"
              value={partCode}
              onChange={(e) => setPartCode(e.target.value)}
              placeholder="Enter part code / battery number (optional)"
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-sm font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1">
                Wholesale Rate (₹)
              </label>
              <input
                type="number"
                value={wholesalePrice}
                onChange={(e) => setWholesalePrice(e.target.value)}
                placeholder="Enter wholesale price (optional)"
                className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-sm font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1">
                Cost Price (₹)
              </label>
              <input
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="Enter cost price (optional)"
                className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-sm font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-iosBlue hover:bg-blue-600 text-white text-xs font-bold rounded-full transition-all shadow-xs disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Part'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
