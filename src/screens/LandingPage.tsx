import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  ArrowRight,
  CheckCircle2,
  Zap,
  MessageSquare,
  WifiOff,
  ShieldCheck,
  TrendingUp,
  Clock,
  Wrench,
  Smartphone,
  ChevronRight,
  Receipt,
  Sparkles,
  Lock,
  Mail
} from 'lucide-react';
import { LegalModal } from '../components/LegalModal';

interface LandingPageProps {
  isAuthenticated?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ isAuthenticated = false }) => {
  const navigate = useNavigate();
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms'>('privacy');

  const handleOpenLegal = (tab: 'privacy' | 'terms') => {
    setLegalTab(tab);
    setIsLegalOpen(true);
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/app');
    } else {
      navigate('/login?mode=register');
    }
  };

  const handleSignIn = () => {
    if (isAuthenticated) {
      navigate('/app');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans selection:bg-blue-500/20">
      {/* 1. Header / Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <img
              src="/icon-192.png"
              alt="My Mobile Shop"
              className="w-9 h-9 rounded-xl shadow-xs border border-black/5 object-cover"
            />
            <span className="text-lg font-black tracking-tight text-slate-900">
              My Mobile Shop
            </span>
          </div>

          {/* Nav links (desktop) */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a href="#benefits" className="hover:text-blue-600 transition-colors">Why It Works</a>
            <a href="#workflow" className="hover:text-blue-600 transition-colors">Daily Routine</a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
            <button
              type="button"
              onClick={() => handleOpenLegal('privacy')}
              className="hover:text-blue-600 transition-colors"
            >
              Privacy
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSignIn}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors"
            >
              {isAuthenticated ? 'Open Shop' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={handleGetStarted}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>{isAuthenticated ? 'Go to App' : 'Get Started'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        {/* Benefit Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-bold mb-6 animate-fade-in shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Built Exclusively for Mobile Retail & Repair Shops</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.15] max-w-3xl mx-auto">
          Run Your Mobile Shop Without the Daily Notebook Chaos
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
          Track daily cash & UPI in seconds, manage customer phone repairs without missed deadlines, and send professional WhatsApp repair receipts—all from your smartphone.
        </p>

        {/* Quick Proof Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>5-second entry speed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-emerald-500" />
            <span>1-tap WhatsApp repair receipts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <WifiOff className="w-4 h-4 text-blue-500" />
            <span>Opens instantly without internet</span>
          </div>
        </div>

        {/* Hero Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
          <button
            type="button"
            onClick={handleGetStarted}
            className="w-full sm:w-auto px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <span>{isAuthenticated ? 'Open Your Day Book' : 'Start Your Shop Ledger'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleSignIn}
            className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-2xl border border-slate-200 transition-all active:scale-95 shadow-2xs"
          >
            {isAuthenticated ? 'Dashboard' : 'Sign In to Existing Shop'}
          </button>
        </div>

        {/* Interactive App Preview Mockup */}
        <div className="mt-12 max-w-lg mx-auto bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 text-left">
          {/* Mock Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Kerala Mobile Care</h4>
                <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Today's Day Book Open
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
              ₹Net: +₹18,300
            </span>
          </div>

          {/* Mock Financial Summary Cards */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Cash IN</span>
              <p className="text-lg font-black text-emerald-900 mt-0.5">₹24,500</p>
              <span className="text-[10px] text-emerald-600 font-medium">14 customer sales</span>
            </div>
            <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-2xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Cash OUT</span>
              <p className="text-lg font-black text-rose-900 mt-0.5">₹6,200</p>
              <span className="text-[10px] text-rose-600 font-medium">Spare parts & tea</span>
            </div>
          </div>

          {/* Mock Repair Card with WhatsApp action */}
          <div className="mt-4 p-3 bg-slate-50 border border-slate-150 rounded-2xl flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 truncate">iPhone 13 - Rahul K.</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase">
                  Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">Display Replacement • ₹3,800</p>
            </div>
            <div className="flex-shrink-0">
              <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                <MessageSquare className="w-3 h-3" />
                WhatsApp
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. The "6 Daily Headaches Solved" Grid */}
      <section id="benefits" className="py-16 bg-white border-y border-slate-200/80 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">
              Practical Shop Benefits
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Designed For The Way Mobile Shops Actually Work
            </h3>
            <p className="mt-3 text-sm text-slate-600">
              Say goodbye to messy registers, forgotten customer parts, and endless telephone follow-ups.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Benefit 1 */}
            <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-blue-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3.5">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1.5">
                Zero Closing Time Confusion
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Know your exact cash-in-hand, UPI collections, and net profit before you lock up your counter tonight. No manual calculator errors.
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-blue-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3.5">
                <Wrench className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1.5">
                Never Miss a Repair Deadline
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                See all customer phones on your workbench at a glance. Filter by Received, Waiting for Parts, or Ready for pickup without digging through shelves.
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-blue-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3.5">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1.5">
                1-Tap WhatsApp Receipts
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Stop disputes before they happen. Send your customer an immediate digital job receipt on WhatsApp showing phone condition, complaint, and estimated charge.
              </p>
            </div>

            {/* Benefit 4 */}
            <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-blue-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3.5">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1.5">
                Never Freezes on Slow Wi-Fi
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Never make a customer wait at your counter. The app opens and records transactions in under 2 seconds, even when shop data or Wi-Fi drops completely.
              </p>
            </div>

            {/* Benefit 5 */}
            <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-blue-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1.5">
                Safe From Lost or Broken Phones
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                If your phone gets dropped or you upgrade to a new model, sign in and your entire shop ledger and repair records restore instantly.
              </p>
            </div>

            {/* Benefit 6 */}
            <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-blue-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-3.5">
                <Receipt className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1.5">
                Month-End Reports in 1 Tap
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Download or export clean monthly income and expense sheets anytime for your business taxes or partner profit sharing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. "A Day with My Mobile Shop" Workflow */}
      <section id="workflow" className="py-16 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">
            Daily Simplicity
          </h2>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            How It Fits Into Your Daily Shop Routine
          </h3>
        </div>

        <div className="space-y-4">
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-start gap-4">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Morning Shop Opening (9:00 AM)</h4>
              <p className="text-xs text-slate-600 mt-1">
                Open the app on your phone. Yesterday's closing cash balance is already waiting. You're ready for the first customer.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-start gap-4">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Busy Afternoon Sales & Repairs (2:00 PM)</h4>
              <p className="text-xs text-slate-600 mt-1">
                Take in a broken phone, log the model & passcode in 10 seconds, and tap WhatsApp to send the customer an immediate receipt.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-start gap-4">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
              3
            </span>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Repair Delivery & Collection (6:30 PM)</h4>
              <p className="text-xs text-slate-600 mt-1">
                Screen replacement done? Mark "Ready" &rarr; customer gets notified on WhatsApp &rarr; comes back to pay and collect their device.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-start gap-4">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
              4
            </span>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Night Shutter Closing (9:30 PM)</h4>
              <p className="text-xs text-slate-600 mt-1">
                Count the physical cash in your drawer, match it with the app total, see today's net profit, and close up feeling relaxed and organized.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Transparent Pricing Section */}
      <section id="pricing" className="py-16 bg-white border-t border-slate-200/80 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">
            Simple, Honest Pricing
          </h2>
          <h3 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Plans That Pay For Themselves On Day One
          </h3>
          <p className="mt-3 text-sm text-slate-600 max-w-xl mx-auto">
            No setup charges, no per-transaction cuts, and no lock-in contracts.
          </p>

          <div className="grid sm:grid-cols-2 gap-6 mt-10 max-w-2xl mx-auto text-left">
            {/* Monthly Plan */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Monthly</span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">₹99</span>
                  <span className="text-sm font-semibold text-slate-500">/ month</span>
                </div>
                <p className="text-xs text-slate-600 mt-2">Billed monthly • Cancel anytime</p>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-700 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Unlimited daily cash & UPI entries</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Unlimited customer repair job cards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Instant WhatsApp job updates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Automatic cloud backup</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleGetStarted}
                className="mt-8 w-full py-3 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 rounded-xl text-xs font-bold transition-colors shadow-2xs"
              >
                Choose Monthly
              </button>
            </div>

            {/* Yearly Plan (Best Value) */}
            <div className="p-6 rounded-3xl bg-blue-50/70 border-2 border-blue-500 flex flex-col justify-between relative shadow-md">
              <div className="absolute -top-3 right-6 bg-emerald-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-xs">
                Save 16% • Best Value
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Yearly</span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">₹999</span>
                  <span className="text-sm font-semibold text-slate-500">/ year</span>
                </div>
                <p className="text-xs text-emerald-700 font-bold mt-2">Just ₹83/month • Peace of mind all year</p>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-700 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Everything in Monthly plan</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Multi-device sign-in support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Priority WhatsApp support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>1-tap Excel/CSV report exports</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleGetStarted}
                className="mt-8 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
              >
                Choose Yearly (Save 16%)
              </button>
            </div>
          </div>

          <div className="mt-6 text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>100% Privacy Protected: We never sell your shop data or show annoying advertisements.</span>
          </div>
        </div>
      </section>

      {/* 6. Footer & Trust */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4 sm:px-6 text-xs border-t border-slate-800">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/icon-192.png"
              alt="My Mobile Shop"
              className="w-8 h-8 rounded-xl object-cover border border-white/10"
            />
            <div>
              <p className="font-bold text-white text-sm">My Mobile Shop</p>
              <p className="text-[11px] text-slate-500">Digital Day Book & Repair Tracker</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium">
            <button
              type="button"
              onClick={() => handleOpenLegal('privacy')}
              className="hover:text-white transition-colors"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => handleOpenLegal('terms')}
              className="hover:text-white transition-colors"
            >
              Terms of Service
            </button>
            <a
              href="mailto:support@mymobileshop.online"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>support@mymobileshop.online</span>
            </a>
          </div>

          <p className="text-[11px] text-slate-500 text-center md:text-right">
            © {new Date().getFullYear()} My Mobile Shop. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Legal Modal */}
      <LegalModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        initialTab={legalTab}
      />
    </div>
  );
};
