import React, { useState } from 'react';
import { X, Users } from 'lucide-react';
import { WholesaleClient } from '../../types/wholesale';
import { normalizeClientPhone } from '../../utils/wholesaleCredit';

interface AddEditClientModalProps {
  isOpen: boolean;
  clientToEdit?: WholesaleClient | null;
  onClose: () => void;
  onSave: (data: {
    shopName: string;
    contactPerson?: string;
    phone: string;
    address?: string;
    creditLimit?: number;
  }) => Promise<void>;
}

export const AddEditClientModal: React.FC<AddEditClientModalProps> = ({
  isOpen,
  clientToEdit,
  onClose,
  onSave,
}) => {
  const [shopName, setShopName] = useState(clientToEdit?.shopName || '');
  const [contactPerson, setContactPerson] = useState(clientToEdit?.contactPerson || '');
  const [phone, setPhone] = useState(clientToEdit?.phone || '');
  const [address, setAddress] = useState(clientToEdit?.address || '');
  const [creditLimit, setCreditLimit] = useState(clientToEdit?.creditLimit?.toString() || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (clientToEdit) {
      setShopName(clientToEdit.shopName);
      setContactPerson(clientToEdit.contactPerson || '');
      setPhone(clientToEdit.phone);
      setAddress(clientToEdit.address || '');
      setCreditLimit(clientToEdit.creditLimit?.toString() || '');
    } else {
      setShopName('');
      setContactPerson('');
      setPhone('');
      setAddress('');
      setCreditLimit('');
    }
  }, [clientToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) {
      setError('Please enter client shop name');
      return;
    }
    const cleanPhone = normalizeClientPhone(phone);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await onSave({
        shopName: shopName.trim(),
        contactPerson: contactPerson.trim() || undefined,
        phone: cleanPhone,
        address: address.trim() || undefined,
        creditLimit: creditLimit ? parseFloat(creditLimit) : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-[16px] w-full max-w-sm p-5 shadow-xl border border-black/[0.06] space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-iosBlue" />
            <h2 className="text-base font-bold text-black tracking-tight">
              {clientToEdit ? 'Edit Client' : 'Add New Client'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-black hover:bg-[#F2F2F7] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <div>
            <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1">
              Client Shop Name
            </label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Enter client shop name"
              autoFocus
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-sm font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1">
              Technician / Owner Name
            </label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="Enter technician name"
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-sm font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1">
              Mobile Number (WhatsApp)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter 10-digit mobile number"
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-sm font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1">
              Market Area / Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter market area or address"
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-sm font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1">
              Credit Limit (Optional)
            </label>
            <input
              type="number"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              placeholder="Enter credit limit (optional)"
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-sm font-medium text-black border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
            />
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
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-iosBlue hover:bg-blue-600 text-white text-xs font-bold rounded-full transition-all shadow-xs disabled:opacity-50"
            >
              {loading ? 'Saving...' : clientToEdit ? 'Save Changes' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
