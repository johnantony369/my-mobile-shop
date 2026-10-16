import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addCustomer, updateCustomer, deleteCustomer, cleanIndianPhone, isValidIndianPhone } from '../db/db';
import { Customer } from '../types';
import { X, Plus, Search, User, Phone, Edit2, Trash2, MapPin, Check } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface CustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomersModal: React.FC<CustomersModalProps> = ({ isOpen, onClose }) => {
  const [rendered, setRendered] = useState(isOpen);
  const [animate, setAnimate] = useState(false);
  const [search, setSearch] = useState('');
  
  // Add / Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const isSubmittingRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Animate modal open/close
  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      const timer = setTimeout(() => setAnimate(true), 20);
      return () => clearTimeout(timer);
    } else {
      setAnimate(false);
      const timer = setTimeout(() => {
        setRendered(false);
        setIsEditing(false);
        setEditingCustomer(null);
        setSearch('');
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Query customers from Dexie
  const customers = useLiveQuery(async () => {
    if (!db.customers) return [];
    const all = await db.customers.toArray();
    return all
      .filter((c) => c.syncStatus !== 'deleted' && !c.deletedAt)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, []) || [];

  // Filter customers by search
  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const query = search.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.phone && c.phone.includes(query)) ||
        (c.address && c.address.toLowerCase().includes(query))
    );
  }, [customers, search]);

  const openAddForm = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormAddress('');
    setFormNotes('');
    setFormError(null);
    isSubmittingRef.current = false;
    setIsEditing(true);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const openEditForm = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormName(cust.name);
    setFormPhone(cust.phone || '');
    setFormAddress(cust.address || '');
    setFormNotes(cust.notes || '');
    setFormError(null);
    isSubmittingRef.current = false;
    setIsEditing(true);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFormError('Customer name is required');
      return;
    }

    let cleanedPhone = formPhone.trim();
    if (cleanedPhone) {
      cleanedPhone = cleanIndianPhone(cleanedPhone);
      if (!isValidIndianPhone(cleanedPhone)) {
        setFormError('Please enter a valid 10-digit mobile number');
        return;
      }
    }

    isSubmittingRef.current = true;
    try {
      if (editingCustomer && editingCustomer.id) {
        await updateCustomer(editingCustomer.id, {
          name: trimmedName,
          phone: cleanedPhone || undefined,
          address: formAddress.trim() || undefined,
          notes: formNotes.trim() || undefined,
        });
      } else {
        await addCustomer({
          name: trimmedName,
          phone: cleanedPhone || undefined,
          address: formAddress.trim() || undefined,
          notes: formNotes.trim() || undefined,
        });
      }
      setIsEditing(false);
      setEditingCustomer(null);
    } catch (err) {
      console.error('Failed to save customer:', err);
      setFormError('Failed to save customer');
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!customerToDelete || !customerToDelete.id) return;
    try {
      await deleteCustomer(customerToDelete.id);
      setCustomerToDelete(null);
    } catch (err) {
      console.error('Failed to delete customer:', err);
    }
  };

  if (!rendered) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-200 ${
          animate ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Main Modal Container */}
      <div
        className={`relative z-10 w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-[24px] shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] transition-transform duration-200 ease-out ${
          animate ? 'translate-y-0' : 'translate-y-full sm:translate-y-6 sm:opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-black/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-blue-50 text-iosBlue flex items-center justify-center font-bold">
              <User className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? (editingCustomer ? 'Edit Customer' : 'Add Customer') : 'Customers'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {isEditing ? 'Fill in customer details' : `${customers.length} registered customers`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                type="button"
                onClick={openAddForm}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-iosBlue text-white text-xs font-semibold shadow-xs hover:bg-blue-600 active:scale-95 transition-all"
              >
                <Plus className="size-3.5" />
                <span>Add Customer</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-90 transition-all"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {isEditing ? (
          /* Add / Edit Form */
          <form onSubmit={handleSaveCustomer} className="flex-1 overflow-y-auto p-5 space-y-4">
            {formError && (
              <div className="p-2.5 rounded-xl bg-red-50 text-iosRed text-xs font-medium border border-red-100">
                {formError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 ml-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full bg-[#F2F2F7] rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 ml-1">
                Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  inputMode="numeric"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  className="w-full bg-[#F2F2F7] rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
                />
                <Phone className="size-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 ml-1">
                Address / City <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="e.g. Main Market, Shop #4"
                className="w-full bg-[#F2F2F7] rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 ml-1">
                Notes <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
                placeholder="Optional customer notes or preferences"
                className="w-full bg-[#F2F2F7] rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04] resize-none"
              />
            </div>

            <div className="pt-2 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:pb-5">
              <button
                type="submit"
                className="w-full py-3 rounded-full bg-iosBlue hover:bg-blue-600 text-white font-semibold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="size-4" />
                <span>{editingCustomer ? 'Update Customer' : 'Save Customer'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Customers List View */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search Bar */}
            <div className="px-5 pt-3 pb-2 shrink-0">
              <div className="relative">
                <Search className="size-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, phone or address..."
                  className="w-full bg-[#F2F2F7] rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-5 py-2 space-y-2 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:pb-5">
              {filteredCustomers.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="size-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <User className="size-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    {search ? 'No matching customers found' : 'No customers saved yet'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {search ? 'Try searching with a different term' : 'Add your regular customers for quick counter entries'}
                  </p>
                  {!search && (
                    <button
                      type="button"
                      onClick={openAddForm}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-iosBlue text-white text-xs font-semibold shadow-xs hover:bg-blue-600 active:scale-95 transition-all"
                    >
                      <Plus className="size-3.5" />
                      <span>Add Customer</span>
                    </button>
                  )}
                </div>
              ) : (
                filteredCustomers.map((cust) => {
                  const initials = cust.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <div
                      key={cust.id || cust.cloudId}
                      className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs hover:shadow-md transition-shadow flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-10 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {initials || <User className="size-4" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{cust.name}</h4>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                            {cust.phone && (
                              <a
                                href={`tel:${cust.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-iosBlue hover:underline font-medium"
                              >
                                <Phone className="size-3" />
                                <span>{cust.phone}</span>
                              </a>
                            )}
                            {cust.address && (
                              <span className="inline-flex items-center gap-1 text-slate-500 truncate max-w-[160px]">
                                <MapPin className="size-3 shrink-0" />
                                <span className="truncate">{cust.address}</span>
                              </span>
                            )}
                          </div>
                          {cust.notes && (
                            <p className="text-[11px] text-slate-400 italic mt-0.5 truncate max-w-xs">
                              {cust.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditForm(cust)}
                          className="p-2 rounded-xl text-slate-400 hover:text-iosBlue hover:bg-slate-50 active:scale-90 transition-all"
                          title="Edit Customer"
                        >
                          <Edit2 className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomerToDelete(cust)}
                          className="p-2 rounded-xl text-slate-400 hover:text-iosRed hover:bg-red-50 active:scale-90 transition-all"
                          title="Delete Customer"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!customerToDelete}
        title="Delete Customer?"
        message={`Are you sure you want to remove ${customerToDelete?.name}? This will not delete their previous daily book records.`}
        confirmLabel="Delete Customer"
        cancelLabel="Cancel"
        isDestructive
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setCustomerToDelete(null)}
      />
    </div>,
    document.body
  );
};
