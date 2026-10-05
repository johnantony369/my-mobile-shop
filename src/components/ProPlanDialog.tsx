import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Crown, Calendar, CalendarRange, Infinity as InfinityIcon, X, RefreshCw } from 'lucide-react';
import { ShopAccountSummary } from '../firebase/admin';
import {
  PRO_PLANS,
  PRO_PLAN_LABELS,
  ProPlan,
  computeProExpiry,
  formatProExpiry,
  isProCurrentlyActive,
} from '../utils/proPlan';

interface ProPlanDialogProps {
  account: ShopAccountSummary | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (plan: ProPlan) => void;
}

const PLAN_META: Record<ProPlan, { blurb: string; icon: React.ReactNode }> = {
  monthly: { blurb: '1 month of full access', icon: <Calendar className="w-5 h-5" /> },
  yearly: { blurb: '12 months of full access', icon: <CalendarRange className="w-5 h-5" /> },
  lifetime: { blurb: 'Full access, never expires', icon: <InfinityIcon className="w-5 h-5" /> },
};

/**
 * Superadmin dialog for choosing which Pro plan to grant a shop.
 * Rendered in a portal so it is always centred in the viewport.
 */
export const ProPlanDialog: React.FC<ProPlanDialogProps> = ({ account, busy = false, onClose, onConfirm }) => {
  const [selected, setSelected] = useState<ProPlan>('monthly');

  useEffect(() => {
    if (account) {
      setSelected(account.proPlan ?? 'monthly');
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [account]);

  if (!account) return null;

  const currentlyActive = isProCurrentlyActive(account);
  const expiryPreview = computeProExpiry(selected, new Date(), currentlyActive ? account.proExpiresAt : null);
  const isRenewal = currentlyActive && selected !== 'lifetime' && !!account.proExpiresAt;

  const dialog = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-[3px]" onClick={busy ? undefined : onClose} />

      <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="px-5 pt-5 pb-3 flex items-start justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              <h3 className="text-base font-black text-slate-900">
                {currentlyActive ? 'Change Pro plan' : 'Activate Pro'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {account.shopName || 'Unnamed Shop'} · {account.email || account.phoneNumber || account.uid}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-2 space-y-2">
          {PRO_PLANS.map(plan => {
            const active = selected === plan;
            return (
              <button
                key={plan}
                type="button"
                onClick={() => setSelected(plan)}
                disabled={busy}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                  active
                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {PLAN_META[plan].icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900">{PRO_PLAN_LABELS[plan]}</span>
                  <span className="block text-xs text-slate-500">{PLAN_META[plan].blurb}</span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="px-5 pt-1 pb-3 text-xs text-slate-500">
          {expiryPreview
            ? `${isRenewal ? 'Extends to' : 'Active until'} ${formatProExpiry(expiryPreview)}.`
            : 'Never expires.'}
        </p>

        <div className="px-5 pb-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {busy && <RefreshCw className="w-4 h-4 animate-spin" />}
            <span>{currentlyActive ? 'Update plan' : 'Activate'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(dialog, document.body) : dialog;
};
