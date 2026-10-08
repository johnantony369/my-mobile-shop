import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  TrendingUp,
  Building2,
  MapPin,
  ChevronRight,
  Edit2,
} from 'lucide-react';
import { Language } from '../../types';
import { WholesaleClient } from '../../types/wholesale';
import { db } from '../../db/db';
import { formatCurrencyINR } from '../../utils/wholesaleCredit';
import { AddEditClientModal } from '../../components/wholesale/AddEditClientModal';
import { ClientLedgerDrawer } from '../../components/wholesale/ClientLedgerDrawer';

export interface ClientsScreenProps {
  language?: Language;
  shopName?: string;
  shopPhone?: string;
  isReadOnly?: boolean;
  isActivated?: boolean;
}

export const ClientsScreen: React.FC<ClientsScreenProps> = ({
  language: _language,
  shopName = 'Spares Hub',
  shopPhone: _shopPhone,
  isReadOnly: _isReadOnly,
  isActivated: _isActivated,
}) => {
  const [clients, setClients] = useState<WholesaleClient[]>([]);
  const [_loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'due' | 'settled'>('all');

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<WholesaleClient | null>(null);
  const [selectedClientForLedger, setSelectedClientForLedger] = useState<WholesaleClient | null>(null);

  const loadClients = async () => {
    setLoading(true);
    try {
      const items = await db.clients.toArray();
      setClients(items);
    } catch (err) {
      console.error('Failed to load clients', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  // Metrics
  const totalCreditDue = useMemo(() => {
    return clients.reduce((acc, c) => acc + (c.currentCreditBalance > 0 ? c.currentCreditBalance : 0), 0);
  }, [clients]);

  const clientsWithCredit = useMemo(() => {
    return clients.filter((c) => c.currentCreditBalance > 0).length;
  }, [clients]);

  // Filtered & searched clients
  const filteredClients = useMemo(() => {
    return clients
      .filter((client) => {
        if (filter === 'due') return client.currentCreditBalance > 0;
        if (filter === 'settled') return client.currentCreditBalance <= 0;
        return true;
      })
      .filter((client) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          client.shopName.toLowerCase().includes(q) ||
          (client.contactPerson && client.contactPerson.toLowerCase().includes(q)) ||
          client.phone.includes(q) ||
          (client.address && client.address.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.currentCreditBalance - a.currentCreditBalance);
  }, [clients, filter, searchQuery]);

  const handleSaveClient = async (data: {
    shopName: string;
    contactPerson?: string;
    phone: string;
    address?: string;
    creditLimit?: number;
  }) => {
    if (clientToEdit) {
      await db.clients.where('cloudId').equals(clientToEdit.cloudId).modify((c: WholesaleClient) => {
        c.shopName = data.shopName;
        c.contactPerson = data.contactPerson;
        c.phone = data.phone;
        c.address = data.address;
        c.creditLimit = data.creditLimit;
        c.updatedAt = new Date().toISOString();
      });
    } else {
      const newClient: WholesaleClient = {
        cloudId: `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        shopName: data.shopName,
        contactPerson: data.contactPerson,
        phone: data.phone,
        address: data.address,
        creditLimit: data.creditLimit,
        currentCreditBalance: 0,
        createdAt: Date.now(),
        updatedAt: new Date().toISOString(),
      };
      await db.clients.add(newClient);
    }
    await loadClients();
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-black tracking-tight">Clients &amp; Credit</h1>
          <p className="text-xs text-[#8E8E93]">Manage retail repair shop clients and credit ledgers</p>
        </div>
        <button
          onClick={() => {
            setClientToEdit(null);
            setIsAddEditModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-iosBlue hover:bg-blue-600 text-white text-xs font-bold rounded-full transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Client</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-white rounded-[16px] border border-black/[0.06] shadow-xs">
          <div className="flex items-center justify-between text-[#8E8E93] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Credit Due</span>
            <TrendingUp className="w-4 h-4 text-iosRed" />
          </div>
          <p className="text-xl font-black text-iosRed">
            {formatCurrencyINR(totalCreditDue)}
          </p>
          <span className="text-[11px] text-[#8E8E93] mt-0.5 block">
            Across {clientsWithCredit} clients
          </span>
        </div>

        <div className="p-4 bg-white rounded-[16px] border border-black/[0.06] shadow-xs">
          <div className="flex items-center justify-between text-[#8E8E93] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Clients</span>
            <Users className="w-4 h-4 text-iosBlue" />
          </div>
          <p className="text-xl font-black text-black">
            {clients.length}
          </p>
          <span className="text-[11px] text-[#8E8E93] mt-0.5 block">
            {clients.length - clientsWithCredit} fully settled
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-[#8E8E93] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search client shop, technician, or phone..."
            className="w-full bg-[#F2F2F7] rounded-[12px] pl-9 pr-4 py-2.5 text-xs font-medium text-black placeholder:text-[#8E8E93] border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-iosBlue/40"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {(
            [
              { key: 'all', label: 'All Clients' },
              { key: 'due', label: 'Has Credit Due' },
              { key: 'settled', label: 'Settled' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filter === tab.key
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-[#F2F2F7] text-[#8E8E93] hover:text-black'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Client List */}
      <div className="space-y-2.5">
        {filteredClients.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#8E8E93] bg-white rounded-[16px] border border-black/[0.06] p-8 space-y-2">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-600">No clients found</p>
            <p className="text-[11px]">
              {searchQuery ? 'Try matching another shop name or phone number' : 'Click "+ Add Client" to add your first retail shop partner'}
            </p>
          </div>
        ) : (
          filteredClients.map((client) => {
            const hasDue = client.currentCreditBalance > 0;
            return (
              <div
                key={client.cloudId || client.id}
                onClick={() => setSelectedClientForLedger(client)}
                className="bg-white rounded-[16px] border border-black/[0.06] p-3.5 shadow-2xs hover:shadow-xs hover:border-black/[0.12] transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-black truncate tracking-tight">
                      {client.shopName}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setClientToEdit(client);
                        setIsAddEditModalOpen(true);
                      }}
                      className="p-1 rounded-full text-slate-400 hover:text-black hover:bg-slate-100 transition-colors"
                      title="Edit Client"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-[#8E8E93] mt-1 flex-wrap">
                    {client.contactPerson && (
                      <span className="font-medium text-slate-700">
                        {client.contactPerson}
                      </span>
                    )}
                    <span className="font-mono">{client.phone}</span>
                    {client.address && (
                      <span className="flex items-center gap-0.5 truncate max-w-[140px]">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {client.address}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-3">
                  <div>
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-full inline-block ${
                        hasDue
                          ? 'bg-red-50 text-iosRed border border-red-200'
                          : 'bg-green-50 text-iosGreen border border-green-200'
                      }`}
                    >
                      {hasDue ? `${formatCurrencyINR(client.currentCreditBalance)} Due` : 'Settled'}
                    </span>
                    {client.creditLimit ? (
                      <span className="text-[10px] text-[#8E8E93] block mt-0.5 font-medium">
                        Limit: {formatCurrencyINR(client.creditLimit)}
                      </span>
                    ) : null}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals & Drawer */}
      <AddEditClientModal
        isOpen={isAddEditModalOpen}
        clientToEdit={clientToEdit}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setClientToEdit(null);
        }}
        onSave={handleSaveClient}
      />

      <ClientLedgerDrawer
        isOpen={!!selectedClientForLedger}
        client={selectedClientForLedger}
        shopName={shopName}
        onClose={() => setSelectedClientForLedger(null)}
        onClientUpdated={async () => {
          await loadClients();
          if (selectedClientForLedger) {
            const fresh = await db.clients.where('cloudId').equals(selectedClientForLedger.cloudId).first();
            if (fresh) setSelectedClientForLedger(fresh);
          }
        }}
      />
    </div>
  );
};
