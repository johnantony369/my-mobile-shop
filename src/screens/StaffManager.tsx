import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { StaffMember } from '../types';
import { Card } from '../components/iOSComponents';
import { Plus, Clock } from 'lucide-react';

interface StaffManagerProps {
  onAddStaff: () => void;
  onEditStaff: (staff: StaffMember) => void;
}

export const StaffManager: React.FC<StaffManagerProps> = ({ onAddStaff, onEditStaff }) => {
  const staffMembers = useLiveQuery(async () => {
    try {
      const all = await db.staff.toArray();
      return all
        .filter((s) => !s.deletedAt && s.syncStatus !== 'deleted')
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      return [];
    }
  }, []) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-extrabold text-[#171717] tracking-tight">Staff</h2>
          <p className="text-[12px] text-[#8E8E93]">Manage team members & roles</p>
        </div>
        <button
          type="button"
          onClick={onAddStaff}
          className="h-9 px-3.5 bg-[#171717] hover:bg-[#2C2C2E] active:scale-95 text-white rounded-full text-[12px] font-bold flex items-center gap-1 shadow-xs transition-all"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Staff</span>
        </button>
      </div>

      {staffMembers.length === 0 ? (
        <Card className="p-6 text-center text-xs text-[#8E8E93]">No staff members added yet.</Card>
      ) : (
        <div className="space-y-2">
          {staffMembers.map((member) => (
            <Card
              key={member.id}
              onClick={() => onEditStaff(member)}
              className="p-3.5 flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#F6F5F3] flex items-center justify-center shrink-0 text-[#171717] font-bold text-sm">
                  {member.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[14px] font-bold text-[#171717] truncate leading-tight">
                      {member.name}
                    </h4>
                    <span className="text-[10px] font-semibold bg-[#EBF7EE] text-[#1E7E34] px-1.5 py-0.2 rounded-full">
                      Active
                    </span>
                  </div>
                  <p className="text-[12px] text-[#4A4A4A] mt-0.5">{member.role}</p>
                  {member.workingSchedule && (
                    <p className="text-[11px] text-[#8E8E93] mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{member.workingSchedule}</span>
                    </p>
                  )}
                </div>
              </div>

              {member.phone && (
                <div className="text-right shrink-0">
                  <span className="text-[12px] font-mono text-[#8E8E93]">{member.phone}</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
