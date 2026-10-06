import React, { useState, useEffect } from 'react';
import { StaffMember } from '../types';
import { db, cleanIndianPhone } from '../db/db';
import { BottomSheet } from '../components/BottomSheet';

interface StaffSheetProps {
  isOpen: boolean;
  onClose: () => void;
  staffToEdit?: StaffMember | null;
  onSaved: () => void;
}

export const StaffSheet: React.FC<StaffSheetProps> = ({
  isOpen,
  onClose,
  staffToEdit,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Stylist');
  const [schedule, setSchedule] = useState('9:30 AM - 7:00 PM');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (staffToEdit) {
      setName(staffToEdit.name);
      setPhone(staffToEdit.phone || '');
      setRole(staffToEdit.role);
      setSchedule(staffToEdit.workingSchedule || '9:30 AM - 7:00 PM');
    } else {
      setName('');
      setPhone('');
      setRole('Stylist');
      setSchedule('9:30 AM - 7:00 PM');
    }
    setError(null);
  }, [staffToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter staff name');
      return;
    }

    try {
      const data = {
        name: name.trim(),
        phone: phone.trim() ? cleanIndianPhone(phone) : undefined,
        role: role.trim() || 'Stylist',
        workingSchedule: schedule.trim() || undefined,
        active: true,
        createdAt: staffToEdit ? staffToEdit.createdAt : Date.now(),
      };

      if (staffToEdit && staffToEdit.id) {
        await db.staff.update(staffToEdit.id, data);
      } else {
        await db.staff.add(data);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save staff');
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={staffToEdit ? 'Edit Staff' : 'Add Staff Member'}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
        {error && (
          <div className="p-2.5 bg-red-50 text-[#D32F2F] text-xs font-semibold rounded-[10px]">
            {error}
          </div>
        )}

        <div>
          <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
            Staff Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Anjali"
            className="w-full bg-[#F6F5F3] rounded-[10px] px-3.5 py-2.5 text-[15px] text-[#171717] border border-black/[0.04] focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
            Role
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Senior Stylist, Beautician"
            className="w-full bg-[#F6F5F3] rounded-[10px] px-3.5 py-2.5 text-[15px] text-[#171717] border border-black/[0.04] focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
            Phone Number (Optional)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10 digits"
            className="w-full bg-[#F6F5F3] rounded-[10px] px-3.5 py-2.5 text-[15px] text-[#171717] border border-black/[0.04] focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
            Working Schedule
          </label>
          <input
            type="text"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            placeholder="e.g. 9:30 AM - 7:00 PM"
            className="w-full bg-[#F6F5F3] rounded-[10px] px-3.5 py-2.5 text-[15px] text-[#171717] border border-black/[0.04] focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-[#171717] hover:bg-[#2C2C2E] active:scale-95 text-white rounded-[14px] text-[14px] font-bold shadow-sm transition-all"
        >
          {staffToEdit ? 'Save Changes' : 'Add Staff Member'}
        </button>
      </form>
    </BottomSheet>
  );
};
