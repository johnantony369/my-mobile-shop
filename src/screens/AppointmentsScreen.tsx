import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, softDeleteAppointment } from '../db/db';
import { Appointment, AppointmentStatus } from '../types';
import { formatINR } from '../i18n';
import { getLocalDateString } from '../utils/date';
import { Card, StatusBadge } from '../components/iOSComponents';
import {
  Calendar,
  Search,
  Plus,
  Phone,
  MessageCircle,
  Receipt,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AppointmentsScreenProps {
  onNewAppointment: () => void;
  onEditAppointment: (appointment: Appointment) => void;
  onOpenBillForAppointment: (appointment: Appointment) => void;
  selectedAppointmentId?: number | null;
}

export const AppointmentsScreen: React.FC<AppointmentsScreenProps> = ({
  onNewAppointment,
  onEditAppointment,
  onOpenBillForAppointment,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Live query for appointments on selectedDate or matching search
  const appointments = useLiveQuery(async () => {
    try {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const all = await db.appointments.toArray();
        return all
          .filter(
            (a) =>
              !a.deletedAt &&
              a.syncStatus !== 'deleted' &&
              (a.customerName.toLowerCase().includes(q) ||
                a.customerPhone.includes(q) ||
                a.serviceName.toLowerCase().includes(q) ||
                (a.staffName && a.staffName.toLowerCase().includes(q)))
          )
          .sort((a, b) => b.createdAt - a.createdAt);
      } else {
        const items = await db.appointments.where('date').equals(selectedDate).toArray();
        return items
          .filter((a) => !a.deletedAt && a.syncStatus !== 'deleted')
          .sort((a, b) => a.time.localeCompare(b.time));
      }
    } catch {
      return [];
    }
  }, [selectedDate, searchQuery]) ?? [];

  // Filter by status if selected
  const displayedAppointments = appointments.filter((a) => {
    if (statusFilter === 'all') return true;
    return a.status === statusFilter;
  });

  const handleDateShift = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const yStr = current.getFullYear();
    const mStr = String(current.getMonth() + 1).padStart(2, '0');
    const dStr = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${yStr}-${mStr}-${dStr}`);
  };

  const handleUpdateStatus = async (appointment: Appointment, newStatus: AppointmentStatus) => {
    if (!appointment.id) return;
    await db.appointments.update(appointment.id, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
    });
    const updated = await db.appointments.get(appointment.id);
    if (updated) setSelectedAppointment(updated);
  };

  const handleCall = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    window.location.href = `tel:${clean}`;
  };

  const handleWhatsApp = (phone: string, name: string, appt: Appointment) => {
    const clean = phone.replace(/\D/g, '');
    const cleanWithCountry = clean.startsWith('91') ? clean : `91${clean}`;
    const text = encodeURIComponent(
      `Hi ${name}, this is from MySalon regarding your appointment for ${appt.serviceName} at ${appt.time} on ${appt.date}.`
    );
    window.open(`https://wa.me/${cleanWithCountry}?text=${text}`, '_blank');
  };

  const isToday = selectedDate === getLocalDateString();

  return (
    <div className="min-h-screen pb-28 px-4 pt-3 max-w-lg mx-auto space-y-4">
      {/* 1. Header & Add Action */}
      <div className="pt-2 flex items-center justify-between select-none">
        <div>
          <h1 className="text-[28px] font-extrabold text-[#171717] tracking-tight leading-tight">
            Appointments
          </h1>
          <p className="text-[12px] text-[#8E8E93] font-medium">
            {isToday ? "Today's schedule" : selectedDate}
          </p>
        </div>
        <button
          type="button"
          onClick={onNewAppointment}
          className="h-10 px-4 bg-[#171717] hover:bg-[#2C2C2E] active:scale-95 text-white rounded-full text-[13px] font-bold flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New</span>
        </button>
      </div>

      {/* 2. Date Navigation Bar */}
      {!searchQuery && (
        <div className="bg-white rounded-[16px] p-2 border border-black/[0.04] shadow-xs flex items-center justify-between select-none">
          <button
            type="button"
            onClick={() => handleDateShift(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-[#171717] hover:bg-gray-100 active:scale-90 transition-all"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <span className="text-[15px] font-bold text-[#171717] block">
              {isToday ? 'Today' : new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <span className="text-[10px] text-[#8E8E93] block font-mono">
              {selectedDate}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleDateShift(1)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-[#171717] hover:bg-gray-100 active:scale-90 transition-all"
            aria-label="Next day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 3. Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customer, phone, service, staff..."
          className="w-full bg-white rounded-[14px] pl-10 pr-9 py-2.5 text-[14px] text-[#171717] placeholder:text-[#8E8E93] border border-black/[0.06] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#171717]/20 transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[#8E8E93] hover:text-[#171717]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 4. Filter Pills */}
      {!searchQuery && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 select-none">
          {['all', 'booked', 'confirmed', 'checked-in', 'completed', 'cancelled'].map((tab) => {
            const isActive = statusFilter === tab;
            const label = tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1);
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#171717] text-white shadow-2xs'
                    : 'bg-white text-[#6B6B6B] border border-black/[0.05] hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* 5. Appointments List */}
      {displayedAppointments.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <div className="w-12 h-12 bg-[#F6F5F3] text-[#8E8E93] rounded-full flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-[16px] font-bold text-[#171717]">No appointments found</h4>
            <p className="text-[12px] text-[#8E8E93] mt-0.5">
              {searchQuery ? 'Try another search term' : 'No bookings for this date.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onNewAppointment}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#171717] text-white text-[12px] font-bold rounded-full shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Appointment</span>
          </button>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {displayedAppointments.map((appt) => (
            <Card
              key={appt.id}
              onClick={() => setSelectedAppointment(appt)}
              className="p-3.5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                {/* Time & Duration */}
                <div className="w-16 shrink-0">
                  <span className="text-[14px] font-black text-[#171717] block leading-tight">
                    {appt.time}
                  </span>
                  <span className="text-[10px] text-[#8E8E93] block mt-0.5">
                    {appt.durationMinutes} min
                  </span>
                </div>

                {/* Customer, Service, Staff */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[15px] font-bold text-[#171717] truncate leading-tight">
                      {appt.customerName}
                    </h4>
                  </div>
                  <p className="text-[13px] font-medium text-[#4A4A4A] truncate mt-0.5">
                    {appt.serviceName}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[#8E8E93]">
                    {appt.staffName && (
                      <span className="truncate">By {appt.staffName}</span>
                    )}
                    <span>• {appt.customerPhone}</span>
                  </div>
                </div>

                {/* Price & Status */}
                <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                  <span className="text-[15px] font-black text-[#171717]">
                    {formatINR(appt.price)}
                  </span>
                  <StatusBadge status={appt.status} size="sm" />
                </div>
              </div>

              {/* Quick Communication Actions */}
              <div className="pt-2 border-t border-black/[0.04] flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCall(appt.customerPhone);
                    }}
                    className="flex items-center gap-1 text-[#171717] font-semibold hover:opacity-80 active:scale-95"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#171717]" />
                    <span>Call</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWhatsApp(appt.customerPhone, appt.customerName, appt);
                    }}
                    className="flex items-center gap-1 text-[#1E7E34] font-semibold hover:opacity-80 active:scale-95"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#1E7E34]" />
                    <span>WhatsApp</span>
                  </button>
                </div>

                {appt.status !== 'completed' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenBillForAppointment(appt);
                    }}
                    className="flex items-center gap-1 text-[#007AFF] font-bold active:scale-95"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Collect Payment</span>
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 6. Appointment Detail Bottom Sheet / Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[3px] transition-opacity"
            onClick={() => setSelectedAppointment(null)}
          />
          <div className="relative z-10 w-full max-w-lg mx-auto bg-white rounded-t-[22px] shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+20px)] animate-fade-slide-in">
            {/* Grab Handle */}
            <div className="w-10 h-1.5 bg-[#C7C7CC] rounded-full mx-auto mb-2" />

            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider block">
                  Appointment Details
                </span>
                <h3 className="text-[20px] font-extrabold text-[#171717]">
                  {selectedAppointment.customerName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#8E8E93] hover:text-[#171717]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Selector */}
            <div className="bg-[#F6F5F3] p-3 rounded-[16px] space-y-2">
              <span className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider block">
                Update Status
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['booked', 'confirmed', 'checked-in', 'completed', 'no-show', 'cancelled'] as AppointmentStatus[]).map(
                  (st) => {
                    const isCurrent = selectedAppointment.status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleUpdateStatus(selectedAppointment, st)}
                        className={`py-2 px-1 rounded-[12px] text-[11px] font-bold transition-all ${
                          isCurrent
                            ? 'bg-[#171717] text-white shadow-xs'
                            : 'bg-white text-[#6B6B6B] border border-black/[0.04]'
                        }`}
                      >
                        {st === 'checked-in' ? 'Checked in' : st === 'no-show' ? 'No-show' : st.charAt(0).toUpperCase() + st.slice(1)}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Summary Details */}
            <div className="space-y-2.5 text-[14px]">
              <div className="flex items-center justify-between py-1 border-b border-black/[0.04]">
                <span className="text-[#8E8E93]">Service</span>
                <span className="font-bold text-[#171717]">{selectedAppointment.serviceName}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-black/[0.04]">
                <span className="text-[#8E8E93]">Date & Time</span>
                <span className="font-bold text-[#171717]">
                  {selectedAppointment.date} at {selectedAppointment.time} ({selectedAppointment.durationMinutes} min)
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-black/[0.04]">
                <span className="text-[#8E8E93]">Staff Assigned</span>
                <span className="font-bold text-[#171717]">
                  {selectedAppointment.staffName || 'Unassigned'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-black/[0.04]">
                <span className="text-[#8E8E93]">Price</span>
                <span className="font-bold text-[#171717]">
                  {formatINR(selectedAppointment.price)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-black/[0.04]">
                <span className="text-[#8E8E93]">Phone</span>
                <span className="font-bold font-mono text-[#171717]">
                  {selectedAppointment.customerPhone}
                </span>
              </div>
              {selectedAppointment.notes && (
                <div className="py-1">
                  <span className="text-[#8E8E93] block text-xs mb-1">Notes</span>
                  <p className="p-2.5 bg-[#F6F5F3] rounded-[10px] text-xs text-[#4A4A4A]">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => {
                  const target = selectedAppointment;
                  setSelectedAppointment(null);
                  onOpenBillForAppointment(target);
                }}
                className="w-full py-3 bg-[#171717] hover:bg-[#2C2C2E] text-white rounded-[14px] text-[14px] font-bold flex items-center justify-center gap-2 shadow-sm"
              >
                <Receipt className="w-4 h-4" />
                <span>Collect Payment / Generate Bill</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedAppointment;
                    setSelectedAppointment(null);
                    onEditAppointment(target);
                  }}
                  className="py-2.5 bg-[#F6F5F3] hover:bg-gray-200 text-[#171717] rounded-[12px] text-[13px] font-bold transition-colors"
                >
                  Edit / Reschedule
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (selectedAppointment.id) {
                      await softDeleteAppointment(selectedAppointment.id);
                      setSelectedAppointment(null);
                    }
                  }}
                  className="py-2.5 bg-red-50 hover:bg-red-100 text-[#D32F2F] rounded-[12px] text-[13px] font-bold transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
