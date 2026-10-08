import React, { useState } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import { MasterSparePart } from '../../types/wholesale';

interface PartCompatibilityModalProps {
  isOpen: boolean;
  part: MasterSparePart | null;
  onClose: () => void;
  onSave: (partId: string, compatibleModels: string[]) => Promise<void>;
}

export const PartCompatibilityModal: React.FC<PartCompatibilityModalProps> = ({
  isOpen,
  part,
  onClose,
  onSave,
}) => {
  const [newModel, setNewModel] = useState('');
  const [models, setModels] = useState<string[]>(part?.compatibleModels || []);
  const [loading, setLoading] = useState(false);

  // Sync state if part changes
  React.useEffect(() => {
    if (part) {
      setModels(part.compatibleModels || [part.model]);
    }
  }, [part]);

  if (!isOpen || !part) return null;

  const handleAddModel = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newModel.trim();
    if (trimmed && !models.includes(trimmed)) {
      setModels([...models, trimmed]);
      setNewModel('');
    }
  };

  const handleRemoveModel = (modelToRemove: string) => {
    setModels(models.filter((m) => m !== modelToRemove));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(part.id, models);
      onClose();
    } catch (err) {
      console.warn('Failed to save compatibility:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-[16px] w-full max-w-sm p-5 shadow-xl border border-black/[0.06] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-iosBlue" />
            <h2 className="text-base font-bold text-black tracking-tight">Cross-Model Compatibility</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-black hover:bg-[#F2F2F7] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <span className="text-xs font-bold text-slate-700 block">{part.model}</span>
          <span className="text-xs text-slate-500 block">
            {part.partName} {part.partCode ? `(${part.partCode})` : ''}
          </span>
        </div>

        <div>
          <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1.5">
            Compatible Models
          </label>
          <div className="flex flex-wrap gap-1.5 mb-3 min-h-[36px] p-2 bg-[#F2F2F7] rounded-[10px] border border-black/[0.04]">
            {models.length === 0 ? (
              <span className="text-xs text-slate-400">No compatible models added yet.</span>
            ) : (
              models.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-xs font-medium text-slate-800 rounded-full shadow-2xs"
                >
                  {m}
                  <button
                    type="button"
                    onClick={() => handleRemoveModel(m)}
                    className="hover:text-red-500 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>

          <form onSubmit={handleAddModel} className="flex gap-2">
            <input
              type="text"
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
              placeholder="Enter compatible phone model"
              className="flex-1 bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-xs font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
            />
            <button
              type="submit"
              disabled={!newModel.trim()}
              className="px-3 py-2 bg-slate-800 hover:bg-black text-white text-xs font-semibold rounded-[10px] transition-all disabled:opacity-40 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </form>
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
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2 bg-iosBlue hover:bg-blue-600 text-white text-xs font-bold rounded-full transition-all shadow-xs disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Compatibility'}
          </button>
        </div>
      </div>
    </div>
  );
};
