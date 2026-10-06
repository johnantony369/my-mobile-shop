import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, cleanIndianPhone } from '../db/db';
import { Appointment, Customer } from '../types';
import { BottomSheet } from '../components/BottomSheet';
import { formatINR } from '../i18n';
import { getLocalDateString } from '../utils/date';

interface AppointmentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentToEdit?: Appointment | null;
  defaultCustomer?: Customer | null;
  onSaved: () => void;
}

export const AppointmentSheet: React.FC<AppointmentSheetProps> = ({
  isOpen,
  onClose,
  appointmentToEdit,
  defaultCustomer,
  onSaved,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [serviceId, setServiceId] = useState<number | ''>('');
  const [staffId, setStaffId] = useState<number | ''>('');
  const [date, setDate] = useState(getLocalDateString());
  const [time, setTime] = useState('10:00 AM');
  const [duration, setDuration] = useState('30');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const services = useLiveQuery(async () => {
    try {
      const all = await db.services.toArray();
      return all.filter((s) => !s.deletedAt && s.syncStatus !== 'deleted' && s.active);
    } catch {
      return [];
    }
  }, []) ?? [];

  const staff = useLiveQuery(async () => {
    try {
      const all = await db.staff.toArray();
      return all.filter((s) => !s.deletedAt && s.syncStatus !== 'deleted' && s.active);
    } catch {
      return [];
    }
  }, []) ?? [];

  const existingCustomers = useLiveQuery(async () => {
    try {
      const all = await db.customers.toArray();
      return all.filter((c) => !c.deletedAt && c.syncStatus !== 'deleted');
    } catch {
      return [];
    }
  }, []) ?? [];

  useEffect(() => {
    if (appointmentToEdit) {
      setCustomerName(appointmentToEdit.customerName || '');
      setCustomerPhone(appointmentToEdit.customerPhone || '');
      setServiceId(appointmentToEdit.serviceId || '');
      setStaffId(appointmentToEdit.staffId || '');
      setDate(appointmentToEdit.date || getLocalDateString());
      setTime(appointmentToEdit.time || '10:00 AM');
      setDuration(String(appointmentToEdit.durationMinutes || '30'));
      setPrice(String(appointmentToEdit.price || ''));
      setNotes(appointmentToEdit.notes || '');
    } else if (defaultCustomer) {
      setCustomerName(defaultCustomer.name);
      setCustomerPhone(defaultCustomer.phone);
      setServiceId('');
      setStaffId('');
      setDate(getLocalDateString());
      setTime('10:00 AM');
      setDuration('30');
      setPrice('');
      setNotes('');
    } else {
      setCustomerName('');
      setCustomerPhone('');
      setServiceId('');
      setStaffId('');
      setDate(getLocalDateString());
      setTime('10:00 AM');
      setDuration('30');
      setPrice('');
      setNotes('');
    }
    setError(null);
  }, [appointmentToEdit, defaultCustomer, isOpen]);

  const handleSelectService = (id: number) => {
    setServiceId(id);
    const s = services.find((item) => item.id === id);
    if (s) {
      setPrice(String(s.price));
      setDuration(String(s.durationMinutes));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError('Please enter customer name');
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('Please enter a valid service price');
      return;
    }

    const selectedService = services.find((s) => s.id === serviceId);
    const selectedStaff = staff.find((st) => st.id === staffId);
    const cleanPhone = cleanIndianPhone(customerPhone);

    try {
      // 1. Ensure customer is saved or linked
      let customerRecord = existingCustomers.find(
        (c) => cleanIndianPhone(c.phone) === cleanPhone
      );

      if (!customerRecord) {
        const newCustomerId = await db.customers.add({
          name: customerName.trim(),
          phone: cleanPhone,
          lastVisit: date,
          visitCount: 1,
          createdAt: Date.now(),
        });
        customerRecord = { id: newCustomerId as number, name: customerName.trim(), phone: cleanPhone, createdAt: Date.now() };
      }

      const appointmentData = {
        customerId: customerRecord?.id,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        serviceId: selectedService?.id,
        serviceName: selectedService ? selectedService.name : 'Custom Service',
        staffId: selectedStaff?.id,
        staffName: selectedStaff?.name,
        date,
        time,
        durationMinutes: parseInt(duration, 10) || 30,
        price: parsedPrice,
        notes: notes.trim() || undefined,
        status: appointmentToEdit ? appointmentToEdit.status : ('booked' as const),
        createdAt: appointmentToEdit ? appointmentToEdit.createdAt : Date.now(),
      };

      if (appointmentToEdit && appointmentToEdit.id) {
        await db.appointments.update(appointmentToEdit.id, appointmentData);
      } else {
        await db.appointments.add(appointmentData);
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save appointment:', err);
      setError('Error saving appointment');
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={appointmentToEdit ? 'Edit Appointment' : 'New Appointment'}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
        {error && (
          <div className="p-2.5 bg-red-50 text-[#D32F2F] text-xs font-semibold rounded-[10px]">
            {error}
          </div>
        )}

        {/* Customer Name & Phone */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
              Customer Name
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Anu"
              className="w-full bg-[#F6F5F3] rounded-[10px] px-3 py-2 text-[14px] text-[#171717] border border-black/[0.04] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="10 digits"
              className="w-full bg-[#F6F5F3] rounded-[10px] px-3 py-2 text-[14px] text-[#171717] border border-black/[0.04] focus:outline-none"
            />
          </div>
        </div>

        {/* Service Picker */}
        <div>
          <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
            Service
          </label>
          <select
            value={serviceId}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : '';
              if (val === '') {
                setServiceId('');
              } else {
                handleSelectService(val);
              }
            }}
            className="w-full bg-[#F6F5F3] rounded-[10px] px-3 py-2.5 text-[14px] text-[#171717] border border-black/[0.04] focus:outline-none"
          >
            <option value="">Select a service...</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.category}) — {formatINR(s.price)}
              </option>
            ))}
          </select>
        </div>

        {/* Staff Picker */}
        <div>
          <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
            Staff Assigned
          </label>
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value ? Number(e.target.value) : '')}
            className="w-full bg-[#F6F5F3] rounded-[10px] px-3 py-2.5 text-[14px] text-[#171717] border border-black/[0.04] focus:outline-none"
          >
            <option value="">Any available stylist</option>
            {staff.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.role})
              </option>
            ))}
          </select>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#F6F5F3] rounded-[10px] px-3 py-2 text-[14px] text-[#171717] border border-black/[0.04] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
              Time
            </label>
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="e.g. 10:30 AM"
              className="w-full bg-[#F6F5F3] rounded-[10px] px-3 py-2 text-[14px] text-[#171717] border border-black/[0.04] focus:outline-none"
            />
          </div>
        </div>

        {/* Duration & Price */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
              Duration (mins)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-[#F6F5F3] rounded-[10px] px-3 py-2 text-[14px] text-[#171717] border border-black/[0.04] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
              Price (₹)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="₹ Amount"
              className="w-full bg-[#F6F5F3] rounded-[10px] px-3 py-2 text-[14px] text-[#171717] border border-black/[0.04] focus:outline-none font-bold"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
            Notes / Special Requests (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. gentle scrub, ammonia-free"
            className="w-full bg-[#F6F5F3] rounded-[10px] px-3 py-2 text-[14px] text-[#171717] border border-black/[0.04] focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-[#171717] hover:bg-[#2C2C2E] active:scale-95 text-white rounded-[14px] text-[14px] font-bold shadow-sm transition-all"
        >
          {appointmentToEdit ? 'Save Changes' : 'Confirm Appointment'}
        </button>
      </form>
    </BottomSheet>
  );
};
