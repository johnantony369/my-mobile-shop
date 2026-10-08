import React, { useState } from 'react';
import { X, Smartphone } from 'lucide-react';
import { MasterDevice } from '../../types/wholesale';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (device: Omit<MasterDevice, 'id'>) => Promise<void>;
}

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({ isOpen, onClose, onSave }) => {
  const [brand, setBrand] = useState('Xiaomi');
  const [model, setModel] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim()) {
      setError('Please enter a phone model name');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSave({
        brand: brand.trim(),
        model: model.trim(),
        releaseYear: releaseYear ? parseInt(releaseYear, 10) : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add phone model');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-[16px] w-full max-w-sm p-5 shadow-xl border border-black/[0.06] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-iosBlue" />
            <h2 className="text-base font-bold text-black tracking-tight">Add Phone Model</h2>
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
              Brand
            </label>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-sm font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
            >
              <option value="Xiaomi">Xiaomi / Redmi</option>
              <option value="Samsung">Samsung</option>
              <option value="Vivo">Vivo / iQOO</option>
              <option value="Oppo">Oppo</option>
              <option value="Realme">Realme</option>
              <option value="Apple">Apple iPhone</option>
              <option value="OnePlus">OnePlus</option>
              <option value="Motorola">Motorola</option>
              <option value="Infinix">Infinix</option>
              <option value="Tecno">Tecno</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1">
              Model Name
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Enter model name"
              autoFocus
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-sm font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1">
              Release Year (Optional)
            </label>
            <input
              type="number"
              value={releaseYear}
              onChange={(e) => setReleaseYear(e.target.value)}
              placeholder="Enter release year (optional)"
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-sm font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
            />
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
              {loading ? 'Adding...' : 'Add Model'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
