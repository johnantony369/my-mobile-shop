import React, { useState, useEffect } from 'react';
import { X, MessageCircle, PlusCircle, CheckCircle2, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { WholesaleClient, ClientTransaction, WholesalePaymentMethod } from '../../types/wholesale';
import { db } from '../../db/db';
import { formatWhatsAppCreditStatement, formatCurrencyINR } from '../../utils/wholesaleCredit';
import { RecordPaymentModal } from './RecordPaymentModal';
import { AddCreditSaleModal } from './AddCreditSaleModal';

interface ClientLedgerDrawerProps {
  isOpen: boolean;
  client: WholesaleClient | null;
  shopName?: string;
  upiId?: string;
  onClose: () => void;
  onClientUpdated: () => void;
}

export const ClientLedgerDrawer: React.FC<ClientLedgerDrawerProps> = ({
  isOpen,
  client,
  shopName,
  upiId,
  onClose,
  onClientUpdated,
}) => {
  const [transactions, setTransactions] = useState<ClientTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCreditSaleModalOpen, setIsCreditSaleModalOpen] = useState(false);

  const loadTransactions = async () => {
    if (!client) return;
    setLoading(true);
    try {
      const items = await db.clientTransactions
        .where('clientCloudId')
        .equals(client.cloudId)
        .reverse()
        .sortBy('createdAt');
      setTransactions(items);
    } catch (err) {
      console.error('Failed to load client transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && client) {
      loadTransactions();
    }
  }, [isOpen, client]);

  if (!isOpen || !client) return null;

  const isOverLimit = client.creditLimit && client.currentCreditBalance > client.creditLimit;

  const handleRecordPayment = async (amount: number, method: WholesalePaymentMethod, note?: string) => {
    const newTx: ClientTransaction = {
      cloudId: `ctx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      clientCloudId: client.cloudId,
      type: 'payment_received',
      amount,
      paymentMethod: method,
      note,
      date: new Date().toISOString().split('T')[0],
      createdAt: Date.now(),
    };
    await db.clientTransactions.add(newTx);
    const updatedBalance = Math.max(0, client.currentCreditBalance - amount);
    await db.clients.where('cloudId').equals(client.cloudId).modify((c: WholesaleClient) => {
      c.currentCreditBalance = updatedBalance;
      c.updatedAt = new Date().toISOString();
    });
    client.currentCreditBalance = updatedBalance;
    await loadTransactions();
    onClientUpdated();
  };

  const handleAddCreditSale = async (amount: number, note: string, date?: string) => {
    const newTx: ClientTransaction = {
      cloudId: `ctx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      clientCloudId: client.cloudId,
      type: 'credit_sale',
      amount,
      note,
      date: date || new Date().toISOString().split('T')[0],
      createdAt: Date.now(),
    };
    await db.clientTransactions.add(newTx);
    const updatedBalance = client.currentCreditBalance + amount;
    await db.clients.where('cloudId').equals(client.cloudId).modify((c: WholesaleClient) => {
      c.currentCreditBalance = updatedBalance;
      c.updatedAt = new Date().toISOString();
    });
    client.currentCreditBalance = updatedBalance;
    await loadTransactions();
    onClientUpdated();
  };

  const handleSendWhatsAppStatement = () => {
    const message = formatWhatsAppCreditStatement(client, shopName || 'Spares Hub', upiId);
    const cleanPhone = client.phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('91') && cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone}`;
    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex justify-end animate-fade-in">
        <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-slide-in-right">
          {/* Header */}
          <div className="p-4 border-b border-black/[0.06] flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="text-base font-bold text-black">{client.shopName}</h2>
              {client.contactPerson && (
                <p className="text-xs text-[#8E8E93]">{client.contactPerson}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Client Balance Card */}
          <div className="p-4 bg-white border-b border-black/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider block">
                  Credit Due
                </span>
                <span className={`text-2xl font-black ${client.currentCreditBalance > 0 ? 'text-iosRed' : 'text-iosGreen'}`}>
                  {formatCurrencyINR(client.currentCreditBalance)}
                </span>
              </div>
              <div className="text-right">
                {client.creditLimit ? (
                  <div>
                    <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider block">
                      Credit Limit
                    </span>
                    <span className="text-sm font-bold text-slate-700">
                      {formatCurrencyINR(client.creditLimit)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {isOverLimit && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                <span>Credit balance exceeds client limit by {formatCurrencyINR(client.currentCreditBalance - (client.creditLimit || 0))}</span>
              </div>
            )}

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => setIsCreditSaleModalOpen(true)}
                className="flex items-center justify-center gap-1.5 py-2 px-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Credit Sale</span>
              </button>
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="flex items-center justify-center gap-1.5 py-2 px-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-xl text-xs font-bold transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Payment</span>
              </button>
              <button
                onClick={handleSendWhatsAppStatement}
                className="flex items-center justify-center gap-1.5 py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Statement</span>
              </button>
            </div>
          </div>

          {/* Ledger History List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">
                Credit Ledger History
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                {transactions.length} entries
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 font-medium">
                Loading ledger transactions...
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-medium">
                No credit transactions recorded for this client yet.
              </div>
            ) : (
              transactions.map((tx) => {
                const isCredit = tx.type === 'credit_sale';
                return (
                  <div
                    key={tx.cloudId || tx.id}
                    className="p-3 bg-white border border-black/[0.06] rounded-[12px] flex items-center justify-between hover:border-black/[0.12] transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`p-2 rounded-lg mt-0.5 ${isCredit ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        {isCredit ? <TrendingUp className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-black">
                            {isCredit ? 'Credit Sale' : 'Payment Received'}
                          </span>
                          {tx.paymentMethod && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded uppercase">
                              {tx.paymentMethod}
                            </span>
                          )}
                        </div>
                        {tx.note && <p className="text-xs text-slate-600 mt-0.5">{tx.note}</p>}
                        <div className="flex items-center gap-1.5 text-[11px] text-[#8E8E93] mt-1">
                          <Clock className="w-3 h-3" />
                          <span>{tx.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-black ${isCredit ? 'text-iosRed' : 'text-iosGreen'}`}>
                        {isCredit ? `+${formatCurrencyINR(tx.amount)}` : `-${formatCurrencyINR(tx.amount)}`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Child Modals */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        client={client}
        onClose={() => setIsPaymentModalOpen(false)}
        onSave={handleRecordPayment}
      />
      <AddCreditSaleModal
        isOpen={isCreditSaleModalOpen}
        client={client}
        onClose={() => setIsCreditSaleModalOpen(false)}
        onSave={handleAddCreditSale}
      />
    </>
  );
};
