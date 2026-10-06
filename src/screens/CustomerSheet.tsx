import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { db, cleanIndianPhone } from '../db/db';
import { BottomSheet } from '../components/BottomSheet';

interface CustomerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
  onSaved: () => void;
}

export const CustomerSheet: React.FC<CustomerSheetProps> = ({
  isOpen,
  onClose,
  customerToEdit,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name);
      setPhone(customerToEdit.phone);
      setNotes(customerToEdit.notes || '');
    } else {
      setName('');
      setPhone('');
      setNotes('');
    }
    setError(null);
  }, [customerToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter customer name');
      return;
    }
    const clean = cleanIndianPhone(phone);
    if (!clean || clean.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      if (customerToEdit && customerToEdit.id) {
        await db.customers.update(customerToEdit.id, {
          name: name.trim(),
          phone: clean,
          notes: notes.trim() || undefined,
        });
      } else {
        await db.customers.add({
          name: name.trim(),
          phone: clean,
          notes: notes.trim() || undefined,
          createdAt: Date.now(),
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save customer');
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={customerToEdit ? 'Edit Customer' : 'Add Customer'}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
        {error && (
          <div className="p-2.5 bg-red-50 text-[#D32F2F] text-xs font-semibold rounded-[10px]">
            {error}
          </div>
        )}

        <div>
          <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Anu"
            className="w-full bg-[#F6F5F3] rounded-[10px] px-3.5 py-2.5 text-[15px] text-[#171717] border border-black/[0.04] focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
            Mobile Number (10 digits)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 9847123456"
            className="w-full bg-[#F6F5F3] rounded-[10px] px-3.5 py-2.5 text-[15px] text-[#171717] border border-black/[0.04] focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
            Preferences / Stylist Notes (Optional)
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Sensitive scalp, prefers organic products"
            className="w-full bg-[#F6F5F3] rounded-[10px] px-3.5 py-2.5 text-[14px] text-[#171717] border border-black/[0.04] focus:outline-none resize-none"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-[#171717] hover:bg-[#2C2C2E] active:scale-95 text-white rounded-[14px] text-[14px] font-bold shadow-sm transition-all"
        >
          {customerToEdit ? 'Save Changes' : 'Save Customer'}
        </button>
      </form>
    </BottomSheet>
  );
};
