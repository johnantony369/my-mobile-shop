import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Search,
  ShieldCheck,
  Crown,
  Database,
  Users,
  Wrench,
  BookOpen,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  ShopAccountSummary,
  fetchAllAccounts,
  setAccountPlan,
  formatBytes,
} from '../firebase/admin';
import {
  PartnerProfile,
  ReferralLead,
  ReferralLeadStatus,
  PartnerStatus,
} from '../types/partner';
import {
  fetchAllPartners,
  setPartnerStatus,
  fetchLeadsForPartnerAdmin,
  updateLeadStatus,
  executePartnerPayout,
} from '../firebase/partnerAdmin';
import { importLeadsBatch, recordPlanConversion } from '../firebase/partner';
import { formatCurrencyINR, CRM_STATUS_LABELS } from '../utils/partner';
import { LeadStatusBadge } from '../components/partner/LeadStatusBadge';
import { CsvImportModal } from '../components/partner/CsvImportModal';
import { useAuth } from '../firebase/useAuth';
import { ProPlanDialog } from '../components/ProPlanDialog';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  ProPlan,
  PRO_PLAN_LABELS,
  isProCurrentlyActive,
  isProExpired,
  formatProExpiry,
} from '../utils/proPlan';
import { Copy, Check, Upload, ChevronRight, Layers } from 'lucide-react';

export const AdminScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Primary Tab: 'shops' | 'partners'
  const [adminTab, setAdminTab] = useState<'shops' | 'partners'>('shops');

  const [accounts, setAccounts] = useState<ShopAccountSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'pro' | 'free'>('all');
  const [actionLoadingUid, setActionLoadingUid] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [planDialogAccount, setPlanDialogAccount] = useState<ShopAccountSummary | null>(null);
  const [revokeAccount, setRevokeAccount] = useState<ShopAccountSummary | null>(null);

  // Partner Program state
  const [partners, setPartners] = useState<PartnerProfile[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [selectedPartnerForLeads, setSelectedPartnerForLeads] = useState<PartnerProfile | null>(null);
  const [partnerLeads, setPartnerLeads] = useState<ReferralLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [settlePartner, setSettlePartner] = useState<PartnerProfile | null>(null);
  const [utrInput, setUtrInput] = useState('');
  const [settleNotes, setSettleNotes] = useState('');
  const [settleLoading, setSettleLoading] = useState(false);
  const [adminCsvPartner, setAdminCsvPartner] = useState<PartnerProfile | null>(null);
  const [copiedUpiUid, setCopiedUpiUid] = useState<string | null>(null);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAllAccounts();
      setAccounts(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Failed to load accounts directory.');
    } finally {
      setLoading(false);
    }
  };

  const loadPartners = async () => {
    try {
      setPartnersLoading(true);
      const data = await fetchAllPartners();
      setPartners(data);
    } catch (err) {
      console.error('Failed to load partners:', err);
    } finally {
      setPartnersLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    loadPartners();
  }, []);

  const openPartnerLeads = async (p: PartnerProfile) => {
    setSelectedPartnerForLeads(p);
    try {
      setLeadsLoading(true);
      const data = await fetchLeadsForPartnerAdmin(p.uid);
      setPartnerLeads(data);
    } catch (err) {
      console.error('Failed to load leads for partner:', err);
    } finally {
      setLeadsLoading(false);
    }
  };

  const handleUpdateLeadStatus = async (
    leadId: string,
    newStatus: ReferralLeadStatus,
    plan?: 'monthly' | 'yearly'
  ) => {
    try {
      await updateLeadStatus(leadId, newStatus, { plan });
      setPartnerLeads(prev =>
        prev.map(l => (l.id === leadId ? { ...l, status: newStatus, planPurchased: plan || l.planPurchased } : l))
      );
      await loadPartners();
    } catch (err) {
      alert(`Could not update lead status: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handlePartnerStatusToggle = async (p: PartnerProfile, nextStatus: PartnerStatus) => {
    try {
      await setPartnerStatus(p.uid, nextStatus);
      setPartners(prev =>
        prev.map(item => (item.uid === p.uid ? { ...item, status: nextStatus } : item))
      );
    } catch (err) {
      alert(`Could not update partner status: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleConfirmSettlement = async () => {
    if (!settlePartner || !utrInput.trim()) return;
    try {
      setSettleLoading(true);
      // Fetch partner leads to find unpaid converted ones
      const leads = await fetchLeadsForPartnerAdmin(settlePartner.uid);
      const payableLeadIds = leads
        .filter(l => l.status === 'plan_purchased')
        .map(l => l.id);

      await executePartnerPayout(
        settlePartner,
        settlePartner.stats.pendingBalance,
        utrInput.trim(),
        payableLeadIds,
        user?.uid || 'admin',
        settleNotes.trim()
      );

      setActionSuccessMsg(`Payout of ${formatCurrencyINR(settlePartner.stats.pendingBalance)} settled for ${settlePartner.businessName} (UTR: ${utrInput.trim()})`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      setSettlePartner(null);
      setUtrInput('');
      setSettleNotes('');
      await loadPartners();
    } catch (err) {
      alert(`Settlement failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSettleLoading(false);
    }
  };

  /** Grants a plan (or revokes when plan is null) and updates the list in place. */
  const applyPlan = async (account: ShopAccountSummary, plan: ProPlan | null) => {
    try {
      setActionLoadingUid(account.uid);
      const currentExpiry = isProCurrentlyActive(account) ? account.proExpiresAt : null;
      const result = await setAccountPlan(account.uid, plan, currentExpiry);

      // Trigger automatic partner referral commission if eligible
      if (plan === 'monthly' || plan === 'yearly') {
        try {
          await recordPlanConversion(account.uid, plan);
          await loadPartners();
        } catch (e) {
          console.warn('Could not record referral conversion:', e);
        }
      }

      setAccounts(prev =>
        prev.map(acc => (acc.uid === account.uid ? { ...acc, ...result } : acc))
      );
      setActionSuccessMsg(
        plan
          ? `${PRO_PLAN_LABELS[plan]} Pro activated for ${account.shopName || 'Shop'}${
              result.proExpiresAt ? ` until ${formatProExpiry(result.proExpiresAt)}` : ''
            }!`
          : `Pro revoked for ${account.shopName || 'Shop'}.`
      );
      setTimeout(() => setActionSuccessMsg(null), 3500);
      setPlanDialogAccount(null);
      setRevokeAccount(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Action failed: ${msg}`);
    } finally {
      setActionLoadingUid(null);
    }
  };

  // Metrics aggregation (an expired monthly/yearly plan counts as Free)
  const metrics = useMemo(() => {
    const totalShops = accounts.length;
    const proShops = accounts.filter(a => isProCurrentlyActive(a)).length;
    const freeShops = totalShops - proShops;
    const totalEntries = accounts.reduce((acc, cur) => acc + (cur.entryCount || 0), 0);
    const totalJobs = accounts.reduce((acc, cur) => acc + (cur.jobCount || 0), 0);
    const totalBytes = accounts.reduce((acc, cur) => acc + (cur.estimatedBytes || 0), 0);

    return {
      totalShops,
      proShops,
      freeShops,
      totalEntries,
      totalJobs,
      totalBytes,
    };
  }, [accounts]);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return accounts.filter(acc => {
      const matchQuery =
        !query ||
        acc.shopName?.toLowerCase().includes(query) ||
        acc.email?.toLowerCase().includes(query) ||
        acc.phoneNumber?.includes(query) ||
        acc.uid.toLowerCase().includes(query);

      if (!matchQuery) return false;
      if (filterMode === 'pro') return isProCurrentlyActive(acc);
      if (filterMode === 'free') return !isProCurrentlyActive(acc);
      return true;
    });
  }, [accounts, searchQuery, filterMode]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-lg sticky top-0 z-40 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* Left: Back button & Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-bold rounded-xl transition-all border border-white/10"
              title="Return to Shop Management"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to App</span>
            </button>

            <div className="h-5 w-px bg-white/20 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shadow-inner">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                    Superadmin Dashboard
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                    Admin Only
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 hidden sm:block">
                  Central accounts directory & cloud usage monitor
                </p>
              </div>
            </div>
          </div>

          {/* Right: Admin email & Refresh button */}
          <div className="flex items-center gap-2.5">
            {user?.email && (
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-mono text-purple-200 bg-purple-950/60 border border-purple-500/30 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                {user.email}
              </span>
            )}
            <button
              type="button"
              onClick={loadAccounts}
              disabled={loading}
              title="Refresh Accounts"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Action Notice Banner */}
      {actionSuccessMsg && (
        <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 px-4 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 animate-fadeIn shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Main Full-Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Switcher */}
        <div className="bg-slate-200/80 p-1 rounded-2xl max-w-md flex items-center gap-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setAdminTab('shops')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              adminTab === 'shops'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📱 Shop Accounts ({accounts.length})
          </button>
          <button
            type="button"
            onClick={() => setAdminTab('partners')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              adminTab === 'partners'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🤝 Partners & Payouts ({partners.length})
          </button>
        </div>

        {adminTab === 'shops' && (
          <div className="space-y-6">
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Shops */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Shops
              </span>
              <span className="text-2xl font-black text-slate-900 leading-tight">
                {metrics.totalShops}
              </span>
              <span className="text-xs text-slate-500 block mt-0.5">
                {metrics.proShops} Pro • {metrics.freeShops} Free
              </span>
            </div>
          </div>

          {/* Pro Licenses */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Crown className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Pro Licenses
              </span>
              <span className="text-2xl font-black text-slate-900 leading-tight">
                {metrics.proShops}
              </span>
              <span className="text-xs text-emerald-600 font-semibold block mt-0.5">
                {metrics.totalShops > 0 ? Math.round((metrics.proShops / metrics.totalShops) * 100) : 0}% activated
              </span>
            </div>
          </div>

          {/* Cloud Records */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Cloud Records
              </span>
              <span className="text-2xl font-black text-slate-900 leading-tight">
                {metrics.totalEntries + metrics.totalJobs}
              </span>
              <span className="text-xs text-slate-500 block mt-0.5">
                {metrics.totalEntries} entries • {metrics.totalJobs} jobs
              </span>
            </div>
          </div>

          {/* Storage Used */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Storage Used
              </span>
              <span className="text-2xl font-black text-slate-900 leading-tight">
                {formatBytes(metrics.totalBytes)}
              </span>
              <span className="text-xs text-slate-500 block mt-0.5">
                Firestore payload
              </span>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search shops by name, email, phone, or UID..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterMode === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({accounts.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('pro')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterMode === 'pro'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pro ({metrics.proShops})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('free')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterMode === 'free'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Free ({metrics.freeShops})
            </button>
          </div>
        </div>

        {/* Directory Content List */}
        {loading ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-xs">
            <RefreshCw className="w-9 h-9 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">
              Loading accounts directory from Firestore...
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Aggregating shops, database records, and license statuses
            </p>
          </div>
        ) : error ? (
          <div className="p-5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
              <div>
                <strong>Error loading accounts:</strong> {error}
              </div>
            </div>
            <button
              type="button"
              onClick={loadAccounts}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl font-bold text-xs shrink-0 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-xs">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-800">
              {searchQuery ? 'No matching accounts found' : 'No accounts registered yet'}
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
              {searchQuery
                ? 'Try searching with a different shop name, phone number, email, or UID.'
                : 'Accounts will automatically appear here as shops log in or sync with the cloud.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-500 px-1 flex items-center justify-between">
              <span>
                Showing <strong>{filteredAccounts.length}</strong> of <strong>{accounts.length}</strong> registered shops
              </span>
            </div>

            {filteredAccounts.map(account => {
              const isItemLoading = actionLoadingUid === account.uid;
              const isProActive = isProCurrentlyActive(account);
              const formattedDate = account.lastActiveAt
                ? new Date(account.lastActiveAt).toLocaleString([], {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : 'Never';

              const phoneClean = account.phoneNumber ? account.phoneNumber.replace(/\D/g, '') : '';
              const whatsappUrl = phoneClean
                ? `https://wa.me/${phoneClean.startsWith('91') ? phoneClean : `91${phoneClean}`}`
                : null;

              return (
                <div
                  key={account.uid}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Shop Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                      <h2 className="text-base font-black text-slate-900 truncate">
                        {account.shopName || 'Unnamed Shop'}
                      </h2>
                      {isProActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                          <Sparkles className="w-3 h-3 text-emerald-500" />
                          {PRO_PLAN_LABELS[account.proPlan ?? 'lifetime']} PRO
                          {account.proExpiresAt && ` · until ${formatProExpiry(account.proExpiresAt)}`}
                        </span>
                      ) : isProExpired(account) ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                          {account.proPlan ? PRO_PLAN_LABELS[account.proPlan] : 'Pro'} expired{' '}
                          {formatProExpiry(account.proExpiresAt)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          Free Trial
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 text-xs text-slate-500 flex-wrap">
                      {account.email && (
                        <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {account.email}
                        </span>
                      )}
                      {account.phoneNumber && (
                        <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {account.phoneNumber}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3 text-slate-300" />
                        Last active: {formattedDate}
                      </span>
                    </div>

                    {/* Data Usage Badges */}
                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                      <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                        {account.entryCount || 0} entries
                      </span>
                      <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-indigo-500" />
                        {account.jobCount || 0} repairs
                      </span>
                      <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-emerald-500" />
                        {formatBytes(account.estimatedBytes || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto justify-end">
                    {/* WhatsApp */}
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Chat on WhatsApp"
                        className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 transition-colors shadow-xs"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    )}
                    {/* Call */}
                    {account.phoneNumber && (
                      <a
                        href={`tel:${account.phoneNumber}`}
                        title="Call Phone"
                        className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 transition-colors shadow-xs"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                    {/* Email */}
                    {account.email && (
                      <a
                        href={`mailto:${account.email}`}
                        title="Send Email"
                        className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 transition-colors shadow-xs"
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    )}

                    {/* Activate / change plan */}
                    <button
                      type="button"
                      onClick={() => setPlanDialogAccount(account)}
                      disabled={isItemLoading}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-500/20 disabled:opacity-60"
                    >
                      {isItemLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Crown className="w-3.5 h-3.5" />
                      )}
                      <span>{isProActive ? 'Change Plan' : 'Activate Pro'}</span>
                    </button>

                    {/* Revoke (only while Pro is switched on) */}
                    {account.activated && (
                      <button
                        type="button"
                        onClick={() => setRevokeAccount(account)}
                        disabled={isItemLoading}
                        className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 border border-red-200 disabled:opacity-60"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Revoke</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Partners & Payouts Tab */}
        {adminTab === 'partners' && (
          <div className="space-y-6">
            {/* Partner Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Partners
                  </span>
                  <span className="text-2xl font-black text-slate-900 leading-tight">
                    {partners.length}
                  </span>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    {partners.filter(p => p.status === 'active').length} Verified
                  </span>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Referred Shops
                  </span>
                  <span className="text-2xl font-black text-blue-600 leading-tight">
                    {partners.reduce((sum, p) => sum + (p.stats.totalLeads || 0), 0)}
                  </span>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    {partners.reduce((sum, p) => sum + (p.stats.paidConversions || 0), 0)} Pro Converted
                  </span>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
                    Pending Settlements
                  </span>
                  <span className="text-2xl font-black text-slate-900 leading-tight tabular-nums">
                    {formatCurrencyINR(partners.reduce((sum, p) => sum + (p.stats.pendingBalance || 0), 0))}
                  </span>
                  <span className="text-xs text-amber-600 block mt-0.5">
                    Awaiting Bank UPI transfer
                  </span>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Paid Out
                  </span>
                  <span className="text-2xl font-black text-purple-600 leading-tight tabular-nums">
                    {formatCurrencyINR(partners.reduce((sum, p) => sum + (p.stats.paidEarnings || 0), 0))}
                  </span>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    Settled to partners
                  </span>
                </div>
              </div>
            </div>

            {/* Pending Settlements Action Queue */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Pending UPI Settlements Queue</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Partners with unpaid Pro conversion earnings ready for UPI transfer
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                  {partners.filter(p => p.stats.pendingBalance > 0).length} Pending
                </span>
              </div>

              {partners.filter(p => p.stats.pendingBalance > 0).length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  ✓ All partner referral earnings are currently fully settled.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {partners
                    .filter(p => p.stats.pendingBalance > 0)
                    .map(p => (
                      <div key={p.uid} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">{p.businessName}</span>
                            <span className="text-[10px] text-slate-400">({p.fullName})</span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                              {p.referralCode}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>Phone: <strong className="text-slate-700">{p.phoneNumber}</strong></span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-mono">
                              UPI: <strong className="text-slate-800">{p.upiId}</strong>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(p.upiId);
                                  setCopiedUpiUid(p.uid);
                                  setTimeout(() => setCopiedUpiUid(null), 2000);
                                }}
                                className="p-1 hover:bg-slate-200 rounded text-iosBlue"
                                title="Copy UPI ID"
                              >
                                {copiedUpiUid === p.uid ? <Check className="size-3.5 text-iosGreen" /> : <Copy className="size-3.5" />}
                              </button>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Payable Balance</p>
                            <p className="text-xl font-black text-emerald-700 tabular-nums">
                              {formatCurrencyINR(p.stats.pendingBalance)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSettlePartner(p)}
                            className="px-4 py-2 bg-iosBlue hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all ios-press"
                          >
                            Settle Payout
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Wholesale Partners Directory Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Partner Accounts Directory
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registered distributors, referral codes, and lead management
                  </p>
                </div>
              </div>

              {partners.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No partners registered yet. Distributors can sign up at <code className="text-iosBlue font-mono">/partner</code>.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] text-slate-400 uppercase font-bold">
                        <th className="py-3 px-4">Partner Firm</th>
                        <th className="py-3 px-3">Market / City</th>
                        <th className="py-3 px-3">Phone & UPI</th>
                        <th className="py-3 px-3">Code</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Shops Attributed</th>
                        <th className="py-3 px-3">Balance (₹)</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {partners.map(p => (
                        <tr key={p.uid} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <p className="font-extrabold text-slate-900">{p.businessName}</p>
                            <p className="text-[11px] text-slate-500">{p.fullName}</p>
                          </td>
                          <td className="py-3.5 px-3 text-slate-600">
                            {p.marketCity}
                          </td>
                          <td className="py-3.5 px-3 font-mono text-[11px] text-slate-700">
                            <p>{p.phoneNumber}</p>
                            <p className="text-slate-400">{p.upiId}</p>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-iosBlue font-mono font-bold text-[11px] border border-blue-100">
                              {p.referralCode}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                p.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : p.status === 'suspended'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {p.status === 'active' ? 'Active' : p.status === 'suspended' ? 'Suspended' : 'Pending'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="font-bold text-slate-900">{p.stats.totalLeads}</span>
                            <span className="text-[11px] text-slate-400 block">{p.stats.paidConversions} Paid Pro</span>
                          </td>
                          <td className="py-3.5 px-3">
                            <p className="font-black text-emerald-700 tabular-nums">
                              {formatCurrencyINR(p.stats.pendingBalance)}
                            </p>
                            <p className="text-[10px] text-slate-400">Paid: {formatCurrencyINR(p.stats.paidEarnings)}</p>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openPartnerLeads(p)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
                            >
                              View Leads
                            </button>

                            <button
                              type="button"
                              onClick={() => setAdminCsvPartner(p)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-iosBlue text-xs font-semibold rounded-lg transition-colors"
                              title="Import CSV leads for this partner"
                            >
                              Import CSV
                            </button>

                            {p.status !== 'active' ? (
                              <button
                                type="button"
                                onClick={() => handlePartnerStatusToggle(p, 'active')}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition-colors"
                              >
                                Activate
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handlePartnerStatusToggle(p, 'suspended')}
                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition-colors"
                              >
                                Suspend
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <ProPlanDialog
        account={planDialogAccount}
        busy={!!planDialogAccount && actionLoadingUid === planDialogAccount.uid}
        onClose={() => setPlanDialogAccount(null)}
        onConfirm={plan => planDialogAccount && applyPlan(planDialogAccount, plan)}
      />

      <ConfirmModal
        isOpen={!!revokeAccount}
        title="Revoke Pro?"
        message={`${revokeAccount?.shopName || 'This shop'} will lose Pro access and return to the free trial rules.`}
        confirmLabel="Revoke"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={() => revokeAccount && applyPlan(revokeAccount, null)}
        onCancel={() => setRevokeAccount(null)}
      />

      {/* Settle Partner Payout Modal */}
      {settlePartner && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-black/10 animate-fade-slide-in">
            <div className="flex items-center justify-between pb-2 border-b border-black/5">
              <h3 className="text-base font-bold text-slate-900">Settle Partner Payout</h3>
              <button
                type="button"
                onClick={() => setSettlePartner(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-black/5 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Partner Firm:</span>
                <span className="font-bold text-slate-900">{settlePartner.businessName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Transfer UPI ID:</span>
                <span className="font-mono font-bold text-slate-900 flex items-center gap-1">
                  {settlePartner.upiId}
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(settlePartner.upiId)}
                    className="p-1 text-iosBlue hover:bg-slate-200 rounded"
                    title="Copy UPI ID"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-black/5">
                <span className="text-slate-500">Total Payable Amount:</span>
                <span className="text-base font-black text-emerald-700 tabular-nums">
                  {formatCurrencyINR(settlePartner.stats.pendingBalance)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Bank UTR / UPI Reference ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter 12-digit UPI UTR number"
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-iosBlue"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Admin Settlement Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid via PhonePe / GPay"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-iosBlue"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSettlePartner(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!utrInput.trim() || settleLoading}
                onClick={handleConfirmSettlement}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                {settleLoading ? <RefreshCw className="size-4 animate-spin" /> : <span>Confirm & Mark as Paid</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partner Leads CRM Drawer Modal */}
      {selectedPartnerForLeads && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-black/10 overflow-hidden animate-fade-slide-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedPartnerForLeads.businessName} — Attributed Leads
                </h3>
                <p className="text-xs text-slate-500">
                  Code: <span className="font-mono font-bold text-iosBlue">{selectedPartnerForLeads.referralCode}</span> • Contact: {selectedPartnerForLeads.fullName} ({selectedPartnerForLeads.phoneNumber})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPartnerForLeads(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {leadsLoading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading leads...</div>
              ) : partnerLeads.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No leads attributed to this partner yet.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {partnerLeads.map((lead) => (
                    <div key={lead.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-xs text-slate-900">{lead.shopName}</p>
                        <p className="text-[11px] font-mono text-slate-500">{lead.ownerPhone} {lead.city ? `• ${lead.city}` : ''}</p>
                        <span className="text-[10px] text-slate-400">
                          Source: {lead.source} • Joined: {new Date(lead.registeredAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={lead.status}
                          onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value as ReferralLeadStatus)}
                          className="text-xs font-semibold px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-xl focus:outline-iosBlue"
                        >
                          <option value="contacted">Contacted</option>
                          <option value="in_trial">In Trial (7d)</option>
                          <option value="not_interested">Not Interested</option>
                          <option value="plan_purchased">Plan Purchased</option>
                          <option value="payout_in_progress">Payout in Progress</option>
                          <option value="paid">Paid</option>
                        </select>

                        <LeadStatusBadge status={lead.status} />

                        {lead.commissionEarned > 0 && (
                          <span className="text-xs font-extrabold text-emerald-700">
                            +{formatCurrencyINR(lead.commissionEarned)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPartnerForLeads(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin CSV Lead Importer Modal */}
      {adminCsvPartner && (
        <CsvImportModal
          isOpen={!!adminCsvPartner}
          onClose={() => setAdminCsvPartner(null)}
          onImport={async (leads) => {
            await importLeadsBatch(adminCsvPartner.uid, adminCsvPartner.referralCode, leads, 'csv_import');
            await loadPartners();
          }}
        />
      )}
    </div>
  );
};
