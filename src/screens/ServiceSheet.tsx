import React, { useState, useEffect } from 'react';
import { SalonService } from '../types';
import { db } from '../db/db';
import { BottomSheet } from '../components/BottomSheet';

interface ServiceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  serviceToEdit?: SalonService | null;
  onSaved: () => void;
}

export const ServiceSheet: React.FC<ServiceSheetProps> = ({
  isOpen,
  onClose,
  serviceToEdit,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Hair');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('30');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (serviceToEdit) {
      setName(serviceToEdit.name);
      setCategory(serviceToEdit.category);
      setPrice(String(serviceToEdit.price));
      setDuration(String(serviceToEdit.durationMinutes));
    } else {
      setName('');
      setCategory('Hair');
      setPrice('');
      setDuration('30');
    }
    setError(null);
  }, [serviceToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter service name');
      return;
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('Please enter a valid price');
      return;
    }

    try {
      const data = {
        name: name.trim(),
        category: category.trim() || 'General',
        price: parsedPrice,
        durationMinutes: parseInt(duration, 10) || 30,
        active: true,
        createdAt: serviceToEdit ? serviceToEdit.createdAt : Date.now(),
      };

      if (serviceToEdit && serviceToEdit.id) {
        await db.services.update(serviceToEdit.id, data);
      } else {
        await db.services.add(data);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save service');
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={serviceToEdit ? 'Edit Service' : 'Add Service'}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
        {error && (
          <div className="p-2.5 bg-red-50 text-[#D32F2F] text-xs font-semibold rounded-[10px]">
            {error}
          </div>
        )}

        <div>
          <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
            Service Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Haircut, Facial, Cleanup"
            className="w-full bg-[#F6F5F3] rounded-[10px] px-3.5 py-2.5 text-[15px] text-[#171717] border border-black/[0.04] focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-[#F6F5F3] rounded-[10px] px-3.5 py-2.5 text-[15px] text-[#171717] border border-black/[0.04] focus:outline-none"
          >
            <option value="Hair">Hair</option>
            <option value="Skin">Skin</option>
            <option value="Makeup">Makeup</option>
            <option value="Nails">Nails</option>
            <option value="Grooming">Grooming</option>
            <option value="Packages">Packages</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
              Price (₹)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="350"
              className="w-full bg-[#F6F5F3] rounded-[10px] px-3.5 py-2.5 text-[15px] text-[#171717] border border-black/[0.04] focus:outline-none font-bold"
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="30"
              className="w-full bg-[#F6F5F3] rounded-[10px] px-3.5 py-2.5 text-[15px] text-[#171717] border border-black/[0.04] focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-[#171717] hover:bg-[#2C2C2E] active:scale-95 text-white rounded-[14px] text-[14px] font-bold shadow-sm transition-all"
        >
          {serviceToEdit ? 'Save Changes' : 'Add Service'}
        </button>
      </form>
    </BottomSheet>
  );
};
