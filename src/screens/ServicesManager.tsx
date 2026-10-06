import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { SalonService } from '../types';
import { formatINR } from '../i18n';
import { Card } from '../components/iOSComponents';
import { Scissors, Plus, Search, X } from 'lucide-react';

interface ServicesManagerProps {
  onAddService: () => void;
  onEditService: (service: SalonService) => void;
}

export const ServicesManager: React.FC<ServicesManagerProps> = ({
  onAddService,
  onEditService,
}) => {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const services = useLiveQuery(async () => {
    try {
      const all = await db.services.toArray();
      const active = all.filter((s) => !s.deletedAt && s.syncStatus !== 'deleted');
      const q = searchQuery.trim().toLowerCase();
      if (!q) return active.sort((a, b) => a.name.localeCompare(b.name));
      return active.filter(
        (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
      );
    } catch {
      return [];
    }
  }, [searchQuery]) ?? [];

  const categories = ['all', ...Array.from(new Set(services.map((s) => s.category)))];

  const displayedServices = services.filter((s) => {
    if (categoryFilter === 'all') return true;
    return s.category === categoryFilter;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-extrabold text-[#171717] tracking-tight">Services</h2>
          <p className="text-[12px] text-[#8E8E93]">Manage menu pricing & duration</p>
        </div>
        <button
          type="button"
          onClick={onAddService}
          className="h-9 px-3.5 bg-[#171717] hover:bg-[#2C2C2E] active:scale-95 text-white rounded-full text-[12px] font-bold flex items-center gap-1 shadow-xs transition-all"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Service</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#8E8E93] absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search haircut, facial, makeup..."
          className="w-full bg-white rounded-[12px] pl-9 pr-8 py-2 text-[13px] border border-black/[0.06] focus:outline-none focus:ring-2 focus:ring-[#171717]/20"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E8E93]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category Pills */}
      {categories.length > 2 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                categoryFilter === cat
                  ? 'bg-[#171717] text-white shadow-2xs'
                  : 'bg-white text-[#6B6B6B] border border-black/[0.05]'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      )}

      {/* Service List */}
      {displayedServices.length === 0 ? (
        <Card className="p-6 text-center text-xs text-[#8E8E93]">No services added yet.</Card>
      ) : (
        <div className="space-y-2">
          {displayedServices.map((s) => (
            <Card
              key={s.id}
              onClick={() => onEditService(s)}
              className="p-3.5 flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#F6F5F3] flex items-center justify-center shrink-0 text-[#171717]">
                  <Scissors className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[14px] font-bold text-[#171717] truncate leading-tight">
                    {s.name}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-[#8E8E93] mt-0.5">
                    <span className="bg-[#EBEAE6] text-[#4A4A4A] px-1.5 py-0.2 rounded font-medium">
                      {s.category}
                    </span>
                    <span>• {s.durationMinutes} min</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[15px] font-extrabold text-[#171717]">
                  {formatINR(s.price)}
                </span>
                <span className="text-[10px] text-[#34C759] font-semibold block">Active</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
