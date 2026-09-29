import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
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
  AlertTriangle
} from 'lucide-react';
import {
  ShopAccountSummary,
  fetchAllAccounts,
  toggleAccountPro,
  formatBytes
} from '../firebase/admin';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
}) => {
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
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen]);

  const handleTogglePro = async (account: ShopAccountSummary) => {
    const nextStatus = !account.activated;
    const confirmMsg = nextStatus
      ? `Activate Lifetime Pro for "${account.shopName}" (${account.email || account.phoneNumber || 'User'})?`
      : `Revoke Pro access for "${account.shopName}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setActionLoadingUid(account.uid);
      await toggleAccountPro(account.uid, nextStatus);
      // Update local list state
      setAccounts(prev =>
        prev.map(acc =>
          acc.uid === account.uid ? { ...acc, activated: nextStatus } : acc
        )
      );
      setActionSuccessMsg(
        `Successfully ${nextStatus ? 'activated' : 'revoked'} Pro for ${account.shopName}!`
      );
      setTimeout(() => setActionSuccessMsg(null), 3000);
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
      // Search match
      const matchQuery =
        !query ||
        acc.shopName?.toLowerCase().includes(query) ||
        acc.email?.toLowerCase().includes(query) ||
        acc.phoneNumber?.includes(query) ||
        acc.uid.toLowerCase().includes(query);

      // Status filter
      if (!matchQuery) return false;
      if (filterMode === 'pro') return acc.activated;
      if (filterMode === 'free') return !acc.activated;
      return true;
    });
  }, [accounts, searchQuery, filterMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-black/10">
        {/* Modal Top Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shadow-inner">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">Superadmin Dashboard</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                  Admin Only
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Accounts directory & real-time data usage monitor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAccounts}
              disabled={loading}
              title="Refresh Accounts"
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Notice */}
        {actionSuccessMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 px-4 py-2 text-xs font-semibold flex items-center gap-1.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Modal Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/60">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Total Shops
                </span>
                <span className="text-xl font-black text-slate-900 leading-tight">
                  {metrics.totalShops}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {metrics.proShops} Pro • {metrics.freeShops} Free
                </span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Pro Licenses
                </span>
                <span className="text-xl font-black text-slate-900 leading-tight">
                  {metrics.proShops}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                  {metrics.totalShops > 0 ? Math.round((metrics.proShops / metrics.totalShops) * 100) : 0}% activated
                </span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Cloud Records
                </span>
                <span className="text-xl font-black text-slate-900 leading-tight">
                  {metrics.totalEntries + metrics.totalJobs}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {metrics.totalEntries} entries • {metrics.totalJobs} jobs
                </span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Storage Used
                </span>
                <span className="text-xl font-black text-slate-900 leading-tight">
                  {formatBytes(metrics.totalBytes)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Firestore payload
                </span>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search shops by name, email, or phone..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterMode === 'free'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Free ({metrics.freeShops})
              </button>
            </div>
          </div>

          {/* Accounts List Section */}
          {loading ? (
            <div className="py-16 text-center">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2.5" />
              <p className="text-xs font-semibold text-slate-500">
                Loading accounts directory from Firestore...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
              <div className="flex-1">
                <strong>Error loading accounts:</strong> {error}
              </div>
              <button
                type="button"
                onClick={loadAccounts}
                className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold text-xs"
              >
                Retry
              </button>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">
                {searchQuery ? 'No matching accounts found' : 'No accounts registered yet'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'Try searching with a different shop name, phone number, or email.'
                  : 'Accounts will automatically appear here as shops log in or sync.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredAccounts.map(account => {
                const isItemLoading = actionLoadingUid === account.uid;
                const formattedDate = account.lastActiveAt
                  ? new Date(account.lastActiveAt).toLocaleString([], {
                      dateStyle: 'short',
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
                    className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* Left Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-black text-slate-900 truncate">
                          {account.shopName || 'Unnamed Shop'}
                        </h3>
                        {account.activated ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Sparkles className="w-3 h-3 text-emerald-500" />
                            Lifetime PRO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            Free Trial
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        {account.email && (
                          <span className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {account.email}
                          </span>
                        )}
                        {account.phoneNumber && (
                          <span className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {account.phoneNumber}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="w-3 h-3 text-slate-300" />
                          Last active: {formattedDate}
                        </span>
                      </div>

                      {/* Data Usage Badges */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-blue-500" />
                          {account.entryCount || 0} entries
                        </span>
                        <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-indigo-500" />
                          {account.jobCount || 0} repairs
                        </span>
                        <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                          <Database className="w-3 h-3 text-emerald-500" />
                          {formatBytes(account.estimatedBytes || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {/* WhatsApp / Phone / Email actions */}
                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Message on WhatsApp"
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>
                      )}
                      {account.phoneNumber && (
                        <a
                          href={`tel:${account.phoneNumber}`}
                          title="Call Phone"
                          className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      {account.email && (
                        <a
                          href={`mailto:${account.email}`}
                          title="Send Email"
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          <Mail className="w-4 h-4" />
                        </a>
                      )}

                      {/* Pro Toggle Button */}
                      <button
                        type="button"
                        onClick={() => handleTogglePro(account)}
                        disabled={isItemLoading}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                          account.activated
                            ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 active:scale-95'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 active:scale-95'
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
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            Viewing <strong>{filteredAccounts.length}</strong> of <strong>{accounts.length}</strong> registered shops
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-colors"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
