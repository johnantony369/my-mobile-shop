import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, softDeleteCustomer } from '../db/db';
import { Customer } from '../types';
import { formatINR } from '../i18n';
import { Card } from '../components/iOSComponents';
import {
  Users,
  Search,
  Plus,
  Phone,
  MessageCircle,
  Calendar,
  Receipt,
  X,
} from 'lucide-react';

interface CustomersScreenProps {
  onAddCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
  onNewAppointmentForCustomer: (customer: Customer) => void;
  onNewBillForCustomer: (customer: Customer) => void;
}

export const CustomersScreen: React.FC<CustomersScreenProps> = ({
  onAddCustomer,
  onEditCustomer,
  onNewAppointmentForCustomer,
  onNewBillForCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Live query for customers
  const customers = useLiveQuery(async () => {
    try {
      const all = await db.customers.toArray();
      const active = all.filter((c) => !c.deletedAt && c.syncStatus !== 'deleted');
      const q = searchQuery.trim().toLowerCase();
      if (!q) {
        return active.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
      }
      return active
        .filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.phone.includes(q) ||
            (c.notes && c.notes.toLowerCase().includes(q))
        )
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      return [];
    }
  }, [searchQuery]) ?? [];

  // Live query for selected customer's visit history (appointments & bills)
  const customerHistory = useLiveQuery(async () => {
    if (!selectedCustomer) return { appointments: [], bills: [] };
    try {
      const cleanPhone = selectedCustomer.phone.replace(/\D/g, '');
      const appts = await db.appointments.toArray();
      const customerAppts = appts.filter(
        (a) =>
          !a.deletedAt &&
          (a.customerId === selectedCustomer.id || a.customerPhone.replace(/\D/g, '') === cleanPhone)
      );

      const bills = await db.bills.toArray();
      const customerBills = bills.filter(
        (b) =>
          !b.deletedAt &&
          (b.customerId === selectedCustomer.id || (b.customerPhone && b.customerPhone.replace(/\D/g, '') === cleanPhone))
      );

      return {
        appointments: customerAppts.sort((a, b) => b.createdAt - a.createdAt),
        bills: customerBills.sort((a, b) => b.createdAt - a.createdAt),
      };
    } catch {
      return { appointments: [], bills: [] };
    }
  }, [selectedCustomer]) ?? { appointments: [], bills: [] };

  const handleCall = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    window.location.href = `tel:${clean}`;
  };

  const handleWhatsApp = (phone: string, name: string) => {
    const clean = phone.replace(/\D/g, '');
    const cleanWithCountry = clean.startsWith('91') ? clean : `91${clean}`;
    const text = encodeURIComponent(`Hi ${name}, greeting from MySalon!`);
    window.open(`https://wa.me/${cleanWithCountry}?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen pb-28 px-4 pt-3 max-w-lg mx-auto space-y-4">
      {/* 1. Header & Add Action */}
      <div className="pt-2 flex items-center justify-between select-none">
        <div>
          <h1 className="text-[28px] font-extrabold text-[#171717] tracking-tight leading-tight">
            Customers
          </h1>
          <p className="text-[12px] text-[#8E8E93] font-medium">
            {customers.length} registered clients
          </p>
        </div>
        <button
          type="button"
          onClick={onAddCustomer}
          className="h-10 px-4 bg-[#171717] hover:bg-[#2C2C2E] active:scale-95 text-white rounded-full text-[13px] font-bold flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add</span>
        </button>
      </div>

      {/* 2. Search Field */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search name, phone, notes..."
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

      {/* 3. Customer List */}
      {customers.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <div className="w-12 h-12 bg-[#F6F5F3] text-[#8E8E93] rounded-full flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-[16px] font-bold text-[#171717]">No customers yet</h4>
            <p className="text-[12px] text-[#8E8E93] mt-0.5">
              {searchQuery ? 'No customer matches your search' : 'Add your first customer to get started.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onAddCustomer}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#171717] text-white text-[12px] font-bold rounded-full shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Customer</span>
          </button>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {customers.map((c) => (
            <Card
              key={c.id}
              onClick={() => setSelectedCustomer(c)}
              className="p-3.5 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-[15px] font-bold text-[#171717] truncate leading-tight">
                    {c.name}
                  </h4>
                  {c.visitCount && c.visitCount > 1 && (
                    <span className="text-[10px] font-semibold bg-[#EBF7EE] text-[#1E7E34] px-1.5 py-0.2 rounded-full">
                      {c.visitCount} visits
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#6B6B6B] font-mono mt-0.5">
                  {c.phone}
                </p>
                {c.notes && (
                  <p className="text-[11px] text-[#8E8E93] line-clamp-1 mt-0.5">
                    {c.notes}
                  </p>
                )}
              </div>

              {/* Total Spent & Last Visit */}
              <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                <span className="text-[14px] font-black text-[#171717]">
                  {formatINR(c.totalSpent || 0)}
                </span>
                <span className="text-[10px] text-[#8E8E93]">
                  {c.lastVisit ? `Last: ${c.lastVisit}` : 'New client'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 4. Customer Profile & History Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[3px] transition-opacity"
            onClick={() => setSelectedCustomer(null)}
          />
          <div className="relative z-10 w-full max-w-lg mx-auto bg-white rounded-t-[22px] shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+20px)] animate-fade-slide-in">
            {/* Grab Handle */}
            <div className="w-10 h-1.5 bg-[#C7C7CC] rounded-full mx-auto mb-2" />

            {/* Profile Overview Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider block">
                  Customer Profile
                </span>
                <h3 className="text-[22px] font-extrabold text-[#171717] leading-tight mt-0.5">
                  {selectedCustomer.name}
                </h3>
                <span className="text-[13px] font-mono text-[#6B6B6B]">
                  {selectedCustomer.phone}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#8E8E93] hover:text-[#171717]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Client Lifetime Metrics */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-[#F6F5F3] p-3 rounded-[14px]">
                <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider block">
                  Total Spent
                </span>
                <span className="text-[18px] font-black text-[#171717] mt-0.5 block">
                  {formatINR(selectedCustomer.totalSpent || 0)}
                </span>
              </div>
              <div className="bg-[#F6F5F3] p-3 rounded-[14px]">
                <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider block">
                  Total Visits
                </span>
                <span className="text-[18px] font-black text-[#171717] mt-0.5 block">
                  {selectedCustomer.visitCount || customerHistory.appointments.length || 0}
                </span>
              </div>
            </div>

            {/* Customer Notes */}
            {selectedCustomer.notes && (
              <div className="p-3 bg-[#FFFDF5] border border-[#FFE082] rounded-[14px]">
                <span className="text-[10px] font-bold text-[#B78103] uppercase tracking-wider block mb-1">
                  Stylist Notes / Preferences
                </span>
                <p className="text-[13px] text-[#5D4037]">
                  {selectedCustomer.notes}
                </p>
              </div>
            )}

            {/* Quick Actions (Call, WhatsApp, New Appointment, New Bill) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleCall(selectedCustomer.phone)}
                className="py-2.5 bg-[#F6F5F3] hover:bg-gray-200 text-[#171717] rounded-[14px] text-[13px] font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>Call Client</span>
              </button>
              <button
                type="button"
                onClick={() => handleWhatsApp(selectedCustomer.phone, selectedCustomer.name)}
                className="py-2.5 bg-[#EBF7EE] hover:bg-green-100 text-[#1E7E34] rounded-[14px] text-[13px] font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const target = selectedCustomer;
                  setSelectedCustomer(null);
                  onNewAppointmentForCustomer(target);
                }}
                className="py-3 bg-[#171717] hover:bg-[#2C2C2E] text-white rounded-[14px] text-[13px] font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Calendar className="w-4 h-4" />
                <span>Book Appt</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = selectedCustomer;
                  setSelectedCustomer(null);
                  onNewBillForCustomer(target);
                }}
                className="py-3 bg-white border border-black/[0.08] hover:bg-gray-50 text-[#171717] rounded-[14px] text-[13px] font-bold flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Receipt className="w-4 h-4" />
                <span>New Bill</span>
              </button>
            </div>

            {/* Visit History Section */}
            <div className="pt-2 space-y-2">
              <span className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider block">
                Visit & Appointment History
              </span>

              {customerHistory.appointments.length === 0 && customerHistory.bills.length === 0 ? (
                <div className="p-4 bg-[#F6F5F3] rounded-[14px] text-center text-[12px] text-[#8E8E93]">
                  No previous appointments on record.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {customerHistory.appointments.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 bg-[#F6F5F3] rounded-[14px] flex items-center justify-between text-[13px]"
                    >
                      <div>
                        <div className="font-bold text-[#171717]">{a.serviceName}</div>
                        <div className="text-[11px] text-[#8E8E93]">
                          {a.date} at {a.time} {a.staffName ? `• ${a.staffName}` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-[#171717] block">
                          {formatINR(a.price)}
                        </span>
                        <span className="text-[10px] text-[#6B6B6B] uppercase font-bold">
                          {a.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Edit & Delete */}
            <div className="pt-2 grid grid-cols-2 gap-2 border-t border-black/[0.04]">
              <button
                type="button"
                onClick={() => {
                  const target = selectedCustomer;
                  setSelectedCustomer(null);
                  onEditCustomer(target);
                }}
                className="py-2.5 bg-[#F6F5F3] hover:bg-gray-200 text-[#171717] rounded-[12px] text-[12px] font-bold"
              >
                Edit Details
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (selectedCustomer.id) {
                    await softDeleteCustomer(selectedCustomer.id);
                    setSelectedCustomer(null);
                  }
                }}
                className="py-2.5 bg-red-50 hover:bg-red-100 text-[#D32F2F] rounded-[12px] text-[12px] font-bold"
              >
                Delete Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
