import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
  LogOut,
  Upload,
  RefreshCw,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Phone,
  AlertCircle,
  HelpCircle,
  ChevronLeft,
} from 'lucide-react';
import { auth } from '../../firebase/config';
import { loginWithPassword, registerWithPassword } from '../../firebase/auth';
import {
  PartnerProfile,
  ReferralLead,
  PartnerPayout,
} from '../../types/partner';
import {
  fetchPartnerProfile,
  registerPartner,
  fetchPartnerLeads,
  fetchPartnerPayouts,
  importLeadsBatch,
} from '../../firebase/partner';
import { formatCurrencyINR, normalizePhoneNumber } from '../../utils/partner';
import { StandeeCard } from '../../components/partner/StandeeCard';
import { CsvImportModal } from '../../components/partner/CsvImportModal';
import { LeadStatusBadge } from '../../components/partner/LeadStatusBadge';
import { LoadingScreen } from '../../components/LoadingScreen';

export const PartnerPortalScreen: React.FC = () => {
  const navigate = useNavigate();

  // Auth & Profile state
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(auth?.currentUser?.uid || null);
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Tab: 'signin' | 'join'
  const [authTab, setAuthTab] = useState<'signin' | 'join'>('join');

  // Form states (Join)
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [marketCity, setMarketCity] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [upiId, setUpiId] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [password, setPassword] = useState('');

  // Form states (Sign In)
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Form submission status
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Leads & Payouts lists
  const [leads, setLeads] = useState<ReferralLead[]>([]);
  const [payouts, setPayouts] = useState<PartnerPayout[]>([]);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Listen to auth changes
  useEffect(() => {
    const unsubscribe = auth?.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUserUid(user.uid);
        await loadPartnerData(user.uid);
      } else {
        setCurrentUserUid(null);
        setPartner(null);
        setLoading(false);
      }
    });
    return () => unsubscribe?.();
  }, []);

  const loadPartnerData = async (uid: string) => {
    try {
      setLoading(true);
      const profile = await fetchPartnerProfile(uid);
      setPartner(profile);
      if (profile) {
        const [leadsData, payoutsData] = await Promise.all([
          fetchPartnerLeads(profile.uid),
          fetchPartnerPayouts(profile.uid),
        ]);
        setLeads(leadsData);
        setPayouts(payoutsData);
      }
    } catch (err) {
      console.error('Failed to load partner data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (currentUserUid) {
      setRefreshing(true);
      await loadPartnerData(currentUserUid);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const normPhone = normalizePhoneNumber(phoneNumber);
    if (!normPhone) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!fullName.trim() || !businessName.trim() || !marketCity.trim() || !upiId.trim() || !referralCode.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    try {
      setFormLoading(true);
      // Register Firebase Auth account using pseudo-email for phone login
      const email = `${normPhone}@partner.mymobileshop.online`;
      const cred = await registerWithPassword(email, password);

      const profile = await registerPartner({
        uid: cred.user.uid,
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        marketCity: marketCity.trim(),
        phoneNumber: normPhone,
        upiId: upiId.trim(),
        referralCode: referralCode.trim().toUpperCase(),
      });

      setPartner(profile);
      setCurrentUserUid(profile.uid);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setFormLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const normPhone = normalizePhoneNumber(loginPhone);
    if (!normPhone) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setFormLoading(true);
      const email = `${normPhone}@partner.mymobileshop.online`;
      const cred = await loginWithPassword(email, loginPassword);
      await loadPartnerData(cred.user.uid);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Invalid mobile number or password.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSignOut = async () => {
    await auth?.signOut();
    setPartner(null);
    setCurrentUserUid(null);
  };

  const handleImportLeads = async (importedLeads: Array<{ shopName: string; phone: string; city?: string }>) => {
    if (!partner) return;
    await importLeadsBatch(partner.uid, partner.referralCode, importedLeads, 'csv_import');
    await handleRefresh();
  };

  if (loading) {
    return (
      <LoadingScreen
        message="Opening Partner Portal..."
        submessage="Connecting to distribution network"
      />
    );
  }

  // View 1: Unauthenticated Partner Join & Sign In
  if (!partner) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] text-slate-900 font-sans selection:bg-[#007AFF]/20 py-8 px-4 sm:px-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#8E8E93] hover:text-slate-900 mb-2 transition-colors"
            >
              <ChevronLeft className="size-4" />
              <span>Back to My Mobile Shop</span>
            </button>
            <div className="size-12 rounded-2xl bg-white shadow-xs border border-black/5 mx-auto flex items-center justify-center">
              <Building2 className="size-6 text-iosBlue" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Wholesale Partner Program
            </h1>
            <p className="text-xs text-[#8E8E93] max-w-xs mx-auto">
              Empower your mobile shop retail buyers with modern ledger & repair tickets while earning recurring commissions.
            </p>
          </div>

          {/* Value Callout */}
          <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Sparkles className="size-4 text-amber-500 shrink-0" />
              <span>Guaranteed Flat Commission Per Converted Shop</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100/60">
                <p className="text-[10px] text-iosBlue font-bold uppercase">Monthly Plan (₹249)</p>
                <p className="text-lg font-black text-slate-900 mt-0.5">₹75</p>
                <p className="text-[10px] text-slate-500">Per shop renewal</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100/60">
                <p className="text-[10px] text-emerald-700 font-bold uppercase">Yearly Plan (₹2,499)</p>
                <p className="text-lg font-black text-slate-900 mt-0.5">₹499</p>
                <p className="text-[10px] text-slate-500">Per annual shop</p>
              </div>
            </div>
          </div>

          {/* Segmented Auth Switch */}
          <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => { setAuthTab('join'); setFormError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-[9px] transition-all ${
                authTab === 'join'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Join Program
            </button>
            <button
              type="button"
              onClick={() => { setAuthTab('signin'); setFormError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-[9px] transition-all ${
                authTab === 'signin'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
          </div>

          {/* Form Error Banner */}
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200/60 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Join Form */}
          {authTab === 'join' ? (
            <form onSubmit={handleJoin} className="bg-white rounded-2xl p-5 border border-black/5 shadow-2xs space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-black/5 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-iosBlue"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Business / Firm Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter business / shop name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-black/5 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-iosBlue"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Wholesale Market / City
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter wholesale market or city"
                  value={marketCity}
                  onChange={(e) => setMarketCity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-black/5 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-iosBlue"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Enter 10-digit mobile number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-black/5 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-iosBlue"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Payout UPI ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter UPI ID (e.g. mobile@upi)"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-black/5 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-iosBlue"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Referral Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="Choose 4–8 uppercase characters (e.g. METRO99)"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-black/5 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-iosBlue"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Create secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-black/5 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-iosBlue"
                />
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-3 bg-iosBlue hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 ios-press"
              >
                <span>{formLoading ? 'Registering...' : 'Complete Partner Registration'}</span>
                <ArrowRight className="size-3.5" />
              </button>
            </form>
          ) : (
            /* Sign In Form */
            <form onSubmit={handleSignIn} className="bg-white rounded-2xl p-5 border border-black/5 shadow-2xs space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Registered Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Enter 10-digit mobile number"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-black/5 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-iosBlue"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-black/5 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-iosBlue"
                />
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-3 bg-iosBlue hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 ios-press"
              >
                <span>{formLoading ? 'Signing In...' : 'Sign In to Partner Portal'}</span>
                <ArrowRight className="size-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // View 2: Authenticated Partner Dashboard
  return (
    <div className="min-h-screen bg-[#F2F2F7] text-slate-900 font-sans selection:bg-[#007AFF]/20 pb-16">
      {/* Translucent Header */}
      <header className="sticky top-0 z-40 bg-[#F2F2F7]/85 backdrop-blur-2xl border-b border-black/5">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-iosBlue text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              <Building2 className="size-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-tight">
                {partner.businessName}
              </p>
              <p className="text-[10px] text-[#8E8E93] leading-none">
                {partner.marketCity} • Code: <span className="font-mono font-bold text-slate-700">{partner.referralCode}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                partner.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {partner.status === 'active' ? 'Verified Partner' : 'Verification Pending'}
            </span>

            <button
              type="button"
              onClick={handleRefresh}
              className="p-2 text-slate-500 hover:text-slate-900 rounded-full active:bg-black/5"
              title="Refresh leads and stats"
            >
              <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="p-2 text-slate-500 hover:text-red-600 rounded-full active:bg-black/5"
              title="Sign Out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Real-time KPI Metric Cards (Real Data Only) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-black/5 shadow-2xs">
            <p className="text-[10px] font-bold text-[#8E8E93] uppercase">Total Leads</p>
            <p className="text-xl font-extrabold text-slate-900 mt-1 tabular-nums">
              {partner.stats.totalLeads}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">QR & CSV shops</p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-black/5 shadow-2xs">
            <p className="text-[10px] font-bold text-blue-600 uppercase">Active Trials</p>
            <p className="text-xl font-extrabold text-blue-600 mt-1 tabular-nums">
              {partner.stats.activeTrials}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">7-day active</p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-black/5 shadow-2xs">
            <p className="text-[10px] font-bold text-emerald-600 uppercase">Paid Pro</p>
            <p className="text-xl font-extrabold text-emerald-600 mt-1 tabular-nums">
              {partner.stats.paidConversions}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Converted shops</p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-iosBlue/20 shadow-2xs bg-blue-50/20 col-span-1">
            <p className="text-[10px] font-bold text-iosBlue uppercase">Pending Payout</p>
            <p className="text-xl font-extrabold text-iosBlue mt-1 tabular-nums">
              {formatCurrencyINR(partner.stats.pendingBalance)}
            </p>
            <p className="text-[10px] text-iosBlue/70 mt-0.5">To be settled</p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-black/5 shadow-2xs col-span-2 sm:col-span-1">
            <p className="text-[10px] font-bold text-purple-600 uppercase">Total Settled</p>
            <p className="text-xl font-extrabold text-purple-600 mt-1 tabular-nums">
              {formatCurrencyINR(partner.stats.paidEarnings)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Received to UPI</p>
          </div>
        </div>

        {/* Counter Standee Card with QR and WhatsApp Share */}
        <StandeeCard partner={partner} />

        {/* Action Header for Leads Table */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Referred Retailers & Leads Directory
            </h2>
            <p className="text-xs text-[#8E8E93]">
              Track onboarding progress and Pro conversion commissions
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCsvModalOpen(true)}
            className="py-2 px-3 bg-white hover:bg-slate-50 border border-black/5 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-all ios-press"
          >
            <Upload className="size-3.5 text-iosBlue" />
            <span>Import CSV</span>
          </button>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-2xs overflow-hidden">
          {leads.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Users className="size-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-800">No shops attributed yet</p>
              <p className="text-[11px] text-[#8E8E93] max-w-sm mx-auto">
                Share your counter QR code with visiting shop owners or upload customer contacts via CSV to begin building your lead ledger.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-black/5 text-[11px] text-[#8E8E93] uppercase font-bold">
                    <th className="py-2.5 px-4">Shop Name</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Source</th>
                    <th className="py-2.5 px-3">CRM Status</th>
                    <th className="py-2.5 px-3">Earned</th>
                    <th className="py-2.5 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {lead.shopName}
                        {lead.city && <span className="block text-[10px] text-[#8E8E93] font-normal">{lead.city}</span>}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">
                        {lead.ownerPhone}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                          {lead.source === 'csv_import' ? 'CSV Import' : lead.source === 'manual_code' ? 'Code Entered' : 'QR Scan'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <LeadStatusBadge status={lead.status} />
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {lead.commissionEarned > 0 ? (
                          <span className="text-emerald-700">+{formatCurrencyINR(lead.commissionEarned)}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-[#8E8E93]">
                        {new Date(lead.registeredAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payout History Section */}
        <div className="space-y-3 pt-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              UPI Payout Settlements History
            </h2>
            <p className="text-xs text-[#8E8E93]">
              All payouts transferred by Super Admin with verifiable Bank UTR numbers
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-black/5 shadow-2xs overflow-hidden">
            {payouts.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="size-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-800">No payout settlements yet</p>
                <p className="text-[11px] text-[#8E8E93]">
                  As referred shops purchase plans, your pending balance accumulates here for monthly UPI settlement.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-black/5 text-[11px] text-[#8E8E93] uppercase font-bold">
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">UPI ID</th>
                      <th className="py-2.5 px-4">Bank UTR / Ref ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {payouts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {new Date(p.processedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-emerald-700 tabular-nums">
                          {formatCurrencyINR(p.amount)}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">
                          {p.partnerUpiId}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {p.utrReference}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* CSV Lead Importer Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImport={handleImportLeads}
      />
    </div>
  );
};

export default PartnerPortalScreen;
