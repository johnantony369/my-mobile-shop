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
  toggleAccountPro,
  formatBytes,
} from '../firebase/admin';
import { useAuth } from '../firebase/useAuth';

export const AdminScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [accounts, setAccounts] = useState<ShopAccountSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'pro' | 'free'>('all');
  const [actionLoadingUid, setActionLoadingUid] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

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

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleTogglePro = async (account: ShopAccountSummary) => {
    const nextStatus = !account.activated;
    const confirmMsg = nextStatus
      ? `Activate Lifetime Pro for "${account.shopName}" (${account.email || account.phoneNumber || 'User'})?`
      : `Revoke Pro access for "${account.shopName}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setActionLoadingUid(account.uid);
      await toggleAccountPro(account.uid, nextStatus);
      setAccounts(prev =>
        prev.map(acc =>
          acc.uid === account.uid ? { ...acc, activated: nextStatus } : acc
        )
      );
      setActionSuccessMsg(
        `Successfully ${nextStatus ? 'activated' : 'revoked'} Pro for ${account.shopName || 'Shop'}!`
      );
      setTimeout(() => setActionSuccessMsg(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Action failed: ${msg}`);
    } finally {
      setActionLoadingUid(null);
    }
  };

  // Metrics aggregation
  const metrics = useMemo(() => {
    const totalShops = accounts.length;
    const proShops = accounts.filter(a => a.activated).length;
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
      if (filterMode === 'pro') return acc.activated;
      if (filterMode === 'free') return !acc.activated;
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
                      {account.activated ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                          <Sparkles className="w-3 h-3 text-emerald-500" />
                          Lifetime PRO
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

                    {/* Pro Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleTogglePro(account)}
                      disabled={isItemLoading}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                        account.activated
                          ? 'bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 border border-red-200'
                          : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-500/20'
                      }`}
                    >
                      {isItemLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : account.activated ? (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      ) : (
                        <Crown className="w-3.5 h-3.5" />
                      )}
                      <span>{account.activated ? 'Revoke Pro' : 'Activate Pro'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
