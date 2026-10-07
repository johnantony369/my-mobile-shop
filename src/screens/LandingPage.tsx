import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Zap,
  MessageSquare,
  WifiOff,
  ShieldCheck,
  TrendingUp,
  Wrench,
  Smartphone,
  Sparkles,
  Mail,
  Menu,
  X,
  Clock,
  ChevronRight
} from 'lucide-react';
import { LegalModal } from '../components/LegalModal';

interface LandingPageProps {
  isAuthenticated?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ isAuthenticated = false }) => {
  const navigate = useNavigate();
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms'>('privacy');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSegment, setActiveSegment] = useState<'daybook' | 'repair' | 'stock'>('daybook');

  const handleOpenLegal = (tab: 'privacy' | 'terms') => {
    setLegalTab(tab);
    setIsLegalOpen(true);
    setMobileMenuOpen(false);
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
    <div className="min-h-screen bg-[#F2F2F7] text-[#000000] font-sans selection:bg-[#007AFF]/20 pb-28 sm:pb-0 overflow-x-hidden antialiased">
      {/* 1. iOS Translucent Blur Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#F2F2F7]/80 backdrop-blur-2xl hairline-b safe-top transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          {/* Brand & App Icon Squircle */}
          <div
            className="flex items-center gap-2.5 cursor-pointer select-none ios-press"
            onClick={() => navigate('/')}
          >
            <img
              src="/icon-192.png"
              alt="My Mobile Shop"
              className="size-8 sm:size-9 rounded-[10px] sm:rounded-ios shadow-xs border border-black/5 object-cover"
            />
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-semibold tracking-tight text-slate-900 leading-tight">
                My Mobile Shop
              </span>
              <span className="text-[10px] text-[#8E8E93] font-medium leading-none hidden sm:inline">
                iOS Counter Edition
              </span>
            </div>
          </div>

          {/* Desktop Capsule Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#8E8E93]">
            <a href="#features" className="hover:text-[#007AFF] transition-colors">Features</a>
            <a href="#workflow" className="hover:text-[#007AFF] transition-colors">Routine</a>
            <a href="#pricing" className="hover:text-[#007AFF] transition-colors">Pricing</a>
            <button
              type="button"
              onClick={() => handleOpenLegal('privacy')}
              className="hover:text-[#007AFF] transition-colors"
            >
              Privacy
            </button>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSignIn}
              className="px-3 py-1.5 text-xs font-semibold text-[#007AFF] active:bg-[#007AFF]/10 rounded-full transition-colors ios-press"
            >
              {isAuthenticated ? 'Open Shop' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={handleGetStarted}
              className="hidden sm:inline-flex px-4 py-2 bg-[#007AFF] hover:bg-[#0062cc] text-white text-xs font-semibold rounded-full shadow-xs transition-all items-center gap-1.5 ios-press"
            >
              <span>{isAuthenticated ? 'Go to App' : 'Get Started'}</span>
              <ArrowRight className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#8E8E93] hover:text-slate-900 rounded-full active:bg-black/5 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-2xl hairline-b px-4 py-3 space-y-2 shadow-lg animate-fade-slide-in">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2.5 text-sm font-semibold text-slate-800 border-b border-black/5"
            >
              <span>Core Features</span>
              <ChevronRight className="size-4 text-[#8E8E93]" />
            </a>
            <a
              href="#workflow"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2.5 text-sm font-semibold text-slate-800 border-b border-black/5"
            >
              <span>Daily Routine</span>
              <ChevronRight className="size-4 text-[#8E8E93]" />
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2.5 text-sm font-semibold text-slate-800 border-b border-black/5"
            >
              <span>Pricing (Launch Special)</span>
              <ChevronRight className="size-4 text-[#8E8E93]" />
            </a>
            <button
              type="button"
              onClick={() => handleOpenLegal('privacy')}
              className="w-full flex items-center justify-between py-2.5 text-sm font-semibold text-slate-800 border-b border-black/5 text-left"
            >
              <span>Privacy Policy</span>
              <ChevronRight className="size-4 text-[#8E8E93]" />
            </button>
            <button
              type="button"
              onClick={() => handleOpenLegal('terms')}
              className="w-full flex items-center justify-between py-2.5 text-sm font-semibold text-slate-800 text-left"
            >
              <span>Terms of Service</span>
              <ChevronRight className="size-4 text-[#8E8E93]" />
            </button>
          </div>
        )}
      </header>

      {/* 2. Hero Section: iOS Dynamic Island + Mobile-First Studio Presentation */}
      <section className="pt-4 pb-10 sm:pt-14 sm:pb-16 px-4 sm:px-6 max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {/* iOS Dynamic Island Status Capsule */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 text-white shadow-lg text-[11px] sm:text-xs font-semibold backdrop-blur-xl border border-white/10 animate-fade-slide-in">
            <span className="size-2 rounded-full bg-[#34C759] animate-pulse" />
            <span className="text-white/90">First 50 Early Access</span>
            <span className="text-white/40">•</span>
            <span className="text-[#34C759] font-bold">Save 64%</span>
          </div>
        </div>

        {/* Hero Headline & Subhead */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.12] text-balance">
            The All-in-One Counter App for Your Mobile Shop.
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-[#8E8E93] font-normal leading-relaxed text-pretty max-w-xl mx-auto">
            Replace paper registers and WhatsApp chaos. Track daily cash & UPI, manage phone repairs, and run your inventory in seconds—even completely offline.
          </p>
        </div>

        {/* Micro Badges (iOS Pill Group) */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-700">
          <span className="inline-flex items-center gap-1.5 bg-white/80 border border-black/5 px-3 py-1 rounded-full shadow-2xs">
            <Zap className="size-3.5 text-amber-500" />
            <span>5s Entry Speed</span>
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/80 border border-black/5 px-3 py-1 rounded-full shadow-2xs">
            <WifiOff className="size-3.5 text-[#007AFF]" />
            <span>100% Offline Ready</span>
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/80 border border-black/5 px-3 py-1 rounded-full shadow-2xs">
            <MessageSquare className="size-3.5 text-[#34C759]" />
            <span>1-Tap WhatsApp Receipts</span>
          </span>
        </div>

        {/* Desktop CTA Row */}
        <div className="hidden sm:flex items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleGetStarted}
            className="px-6 py-3 bg-[#007AFF] hover:bg-[#0062cc] text-white text-sm font-semibold rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-2 ios-press"
          >
            <span>{isAuthenticated ? 'Open Day Book' : 'Start Your Shop Ledger'}</span>
            <ArrowRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleSignIn}
            className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold rounded-full border border-black/5 transition-all shadow-2xs ios-press"
          >
            {isAuthenticated ? 'Dashboard' : 'Sign In to Existing Shop'}
          </button>
        </div>

        {/* 3. Hero Visual & Interactive iOS Counter Widget */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch pt-2">
          {/* Left: 3D Studio Mockup Card */}
          <div className="md:col-span-7 bg-white rounded-[24px] sm:rounded-3xl p-3 sm:p-4 border border-black/5 shadow-sm overflow-hidden flex flex-col justify-between">
            <div className="relative rounded-2xl overflow-hidden bg-slate-100 aspect-4/3 border border-black/5">
              <img
                src="/hero-preview.jpg"
                alt="My Mobile Shop counter workspace"
                className="w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-xs text-[10px] font-bold text-slate-800 flex items-center gap-1.5 border border-black/5">
                <span className="size-2 rounded-full bg-[#34C759]" />
                <span>Live Shop Dashboard</span>
              </div>
            </div>

            <div className="pt-3 px-1 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-[#34C759]/10 text-[#34C759] flex items-center justify-center font-bold">
                  <TrendingUp className="size-3.5" />
                </div>
                <div>
                  <p className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider">Today's Net Cash</p>
                  <p className="text-sm font-black text-slate-900 tabular-nums">+₹18,300</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#007AFF]/10 text-[#007AFF]">
                Day Book Balanced
              </span>
            </div>
          </div>

          {/* Right: iOS Segmented Live Interactive Widget */}
          <div className="md:col-span-5 bg-white rounded-[24px] sm:rounded-3xl p-4 sm:p-5 border border-black/5 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 hairline-b">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Interactive Counter Preview
                </p>
                <span className="text-[10px] font-bold text-[#8E8E93]">Tap to test</span>
              </div>

              {/* iOS Segmented Control */}
              <div className="mt-3.5 p-1 bg-[#767680]/12 rounded-xl flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveSegment('daybook')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-[9px] transition-all ios-press ${
                    activeSegment === 'daybook'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Day Book
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSegment('repair')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-[9px] transition-all ios-press ${
                    activeSegment === 'repair'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Repairs
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSegment('stock')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-[9px] transition-all ios-press ${
                    activeSegment === 'stock'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Stock
                </button>
              </div>

              {/* Segmented Content */}
              <div className="mt-4 space-y-2.5">
                {activeSegment === 'daybook' && (
                  <div className="space-y-2 animate-fade-slide-in">
                    <div className="p-3 rounded-xl bg-[#34C759]/8 border border-[#34C759]/20 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">Screen Replacement</p>
                        <p className="text-[10px] text-[#34C759] font-medium">Customer UPI • Rahul S.</p>
                      </div>
                      <p className="text-sm font-black text-[#34C759] tabular-nums">+₹2,400</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FF3B30]/8 border border-[#FF3B30]/20 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">Wholesale Spares</p>
                        <p className="text-[10px] text-[#FF3B30] font-medium">Cash Out • Metro Spares</p>
                      </div>
                      <p className="text-sm font-black text-[#FF3B30] tabular-nums">-₹1,150</p>
                    </div>
                  </div>
                )}

                {activeSegment === 'repair' && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-black/5 space-y-2 animate-fade-slide-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">iPhone 13 - Display</span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#34C759]/15 text-[#34C759]">
                        Ready
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8E8E93]">Passcode: 1478 • Est: ₹3,800</p>
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-600">WhatsApp Alert Sent</span>
                      <span className="size-4 rounded-full bg-[#34C759] text-white flex items-center justify-center text-[10px]">✓</span>
                    </div>
                  </div>
                )}

                {activeSegment === 'stock' && (
                  <div className="space-y-2 animate-fade-slide-in">
                    <div className="p-3 rounded-xl bg-slate-50 border border-black/5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">65W Type-C Chargers</p>
                        <p className="text-[10px] text-[#8E8E93]">Fast Moving Accessory</p>
                      </div>
                      <span className="text-xs font-bold text-slate-900 tabular-nums">14 pcs</span>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-amber-950">iPhone 11 Batteries</p>
                        <p className="text-[10px] text-amber-700">Low Stock Re-order</p>
                      </div>
                      <span className="text-xs font-bold text-amber-700 tabular-nums">2 left</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 text-[11px] text-[#8E8E93] text-center font-medium">
              Runs in &lt;2s on low-end smartphones with zero lag.
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Features Section: iOS Grouped Cards */}
      <section id="features" className="py-12 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[#007AFF]">
            Core Capabilities
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight text-balance">
            Built for Real Counter Workflows
          </h2>
          <p className="text-xs sm:text-sm text-[#8E8E93] text-pretty">
            Engineered so you never have to scramble through paper notebooks again.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Day Book */}
          <div className="bg-white rounded-[24px] border border-black/5 overflow-hidden shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
            <div className="aspect-square w-full overflow-hidden bg-slate-100">
              <img
                src="/daily-ledger-preview.jpg"
                alt="Daily cash ledger preview"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="p-5 space-y-2">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#34C759] bg-[#34C759]/10 px-2.5 py-0.5 rounded-full">
                <TrendingUp className="size-3" />
                <span>Digital Day Book</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Zero closing discrepancies.
              </h3>
              <p className="text-xs text-[#8E8E93] leading-relaxed text-pretty">
                Record cash and UPI in 5 seconds. Reconcile physical drawer cash and net profit before pulling down the shutter.
              </p>
            </div>
          </div>

          {/* Card 2: Repairs & Receipts */}
          <div className="bg-white rounded-[24px] border border-black/5 overflow-hidden shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
            <div className="aspect-square w-full overflow-hidden bg-slate-100">
              <img
                src="/repair-receipt-preview.jpg"
                alt="Repair receipt and WhatsApp status"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="p-5 space-y-2">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#007AFF] bg-[#007AFF]/10 px-2.5 py-0.5 rounded-full">
                <Wrench className="size-3" />
                <span>Repair Job Cards</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                No lost phones. No disputes.
              </h3>
              <p className="text-xs text-[#8E8E93] leading-relaxed text-pretty">
                Log phone passcodes, faults, and quotes. Send instant digital WhatsApp job sheets and notify customers when ready.
              </p>
            </div>
          </div>

          {/* Card 3: Used Phones & Tools */}
          <div className="bg-white rounded-[24px] border border-black/5 overflow-hidden shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
            <div className="aspect-square w-full overflow-hidden bg-slate-100">
              <img
                src="/used-phones-preview.jpg"
                alt="Used phone KYC and IMEI verification"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="p-5 space-y-2">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                <Smartphone className="size-3" />
                <span>Used Phones Hub</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Buy, test, and sell safely.
              </h3>
              <p className="text-xs text-[#8E8E93] leading-relaxed text-pretty">
                Capture second-hand phone buybacks with customer KYC photos and IMEI records. Quick CEIR portal check prevents stolen stock.
              </p>
            </div>
          </div>
        </div>

        {/* Counter Performance Bar (iOS Inset Row) */}
        <div className="bg-white rounded-[20px] p-4 sm:p-5 border border-black/5 shadow-2xs grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">&lt;2s</p>
            <p className="text-[11px] text-[#8E8E93] font-medium mt-0.5">App Startup Speed</p>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-[#007AFF] tabular-nums">100%</p>
            <p className="text-[11px] text-[#8E8E93] font-medium mt-0.5">Offline Reliability</p>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-[#34C759] tabular-nums">1-Tap</p>
            <p className="text-[11px] text-[#8E8E93] font-medium mt-0.5">WhatsApp Slips</p>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">Zero</p>
            <p className="text-[11px] text-[#8E8E93] font-medium mt-0.5">Calculator Errors</p>
          </div>
        </div>
      </section>

      {/* 5. Workflow Section: iOS Step List */}
      <section id="workflow" className="py-12 sm:py-16 px-4 sm:px-6 max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[#007AFF]">
            Daily Simplicity
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight text-balance">
            Fits Into Your Counter Routine
          </h2>
          <p className="text-xs sm:text-sm text-[#8E8E93] text-pretty">
            Save 30-45 minutes of manual bookkeeping every single evening.
          </p>
        </div>

        <div className="bg-white rounded-[24px] border border-black/5 divide-y divide-black/5 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 flex items-start gap-4">
            <span className="size-8 rounded-full bg-[#007AFF]/10 text-[#007AFF] text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">Morning Shop Opening (9:00 AM)</h4>
              <p className="text-xs text-[#8E8E93] leading-relaxed text-pretty">
                Open the app on your phone. Yesterday's closing cash balance is automatically waiting as today's opening cash. You're ready for customer #1.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 flex items-start gap-4">
            <span className="size-8 rounded-full bg-[#007AFF]/10 text-[#007AFF] text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">Afternoon Rush & Repairs (2:00 PM)</h4>
              <p className="text-xs text-[#8E8E93] leading-relaxed text-pretty">
                Take in a repair phone, log model, passcode, and fault in 10 seconds. Tap WhatsApp to issue an instant receipt so customers never dispute pre-existing marks.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 flex items-start gap-4">
            <span className="size-8 rounded-full bg-[#007AFF]/10 text-[#007AFF] text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
              3
            </span>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">Night Shutter Closing (9:30 PM)</h4>
              <p className="text-xs text-[#8E8E93] leading-relaxed text-pretty">
                Count physical cash in your drawer, match it with the Day Book total, export a clean PDF or Excel report if needed, and close up feeling relaxed and organized.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Pricing Section: iOS In-App Purchase Card Styling */}
      <section id="pricing" className="py-12 sm:py-16 px-4 sm:px-6 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          {/* Limited Early Bird Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#34C759]/15 text-[#34C759] text-xs font-bold">
            <Sparkles className="size-3.5" />
            <span>Launch Special • First 50 Users Only</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight text-balance">
            Honest Plans for Shop Owners
          </h2>
          <p className="text-xs sm:text-sm text-[#8E8E93] text-pretty">
            Zero setup fees. Zero commission on your sales.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto items-stretch">
          {/* Monthly Plan */}
          <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-2xs flex flex-col justify-between space-y-5">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">
                  Monthly Plan
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  50% OFF
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-slate-400 line-through tabular-nums">
                    ₹499
                  </span>
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tabular-nums">
                    ₹249
                  </span>
                  <span className="text-xs font-semibold text-[#8E8E93]">/ month</span>
                </div>

                {/* Highlight per day cost */}
                <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#007AFF]/10 text-[#007AFF] text-xs font-bold">
                  <Clock className="size-3.5 shrink-0" />
                  <span>Just ~₹8.30 / day</span>
                </div>
              </div>

              <p className="text-xs text-[#8E8E93]">
                Billed monthly • Cancel anytime
              </p>

              <ul className="space-y-2 text-xs text-slate-700 pt-2 hairline-t">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#34C759] shrink-0" />
                  <span>Unlimited Cash & UPI ledger entries</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#34C759] shrink-0" />
                  <span>Unlimited repair job sheets & WhatsApp slips</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#34C759] shrink-0" />
                  <span>Accessories stock alerts & reports</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#34C759] shrink-0" />
                  <span>Automatic cloud backup & offline mode</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleGetStarted}
              className="w-full py-3 bg-[#F2F2F7] hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-bold transition-all ios-press min-h-[44px]"
            >
              Choose Monthly (₹249/mo)
            </button>
          </div>

          {/* Yearly Plan (Best Value - 64% OFF) */}
          <div className="bg-white rounded-[24px] p-6 border-2 border-[#007AFF] shadow-md flex flex-col justify-between space-y-5 relative">
            <div className="absolute -top-3 right-5 bg-[#007AFF] text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
              Save 64% • Best Value
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#007AFF]">
                  Annual Plan
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#34C759]/15 text-[#34C759]">
                  Early 50 Shops Special
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-slate-400 line-through tabular-nums">
                    ₹4,999
                  </span>
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tabular-nums">
                    ₹1,799
                  </span>
                  <span className="text-xs font-semibold text-[#8E8E93]">/ year</span>
                </div>

                {/* Highlight per day cost */}
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#34C759]/15 text-[#34C759] text-xs font-bold">
                  <Sparkles className="size-3.5 shrink-0" />
                  <span>Just ~₹4.90 / day (₹150/month)</span>
                </div>
              </div>

              <p className="text-xs text-[#34C759] font-semibold">
                Less than half a cup of chai a day for a full year of peace of mind
              </p>

              <ul className="space-y-2 text-xs text-slate-700 pt-2 hairline-t">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#007AFF] shrink-0" />
                  <span className="font-bold text-slate-900">Everything in Monthly plan</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#007AFF] shrink-0" />
                  <span>Multi-device sync across counter phones</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#007AFF] shrink-0" />
                  <span>1-tap Excel/CSV exports for accounting</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#007AFF] shrink-0" />
                  <span>Used Phone Hub & CEIR check tools</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#007AFF] shrink-0" />
                  <span>Priority WhatsApp customer support</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleGetStarted}
              className="w-full py-3 bg-[#007AFF] hover:bg-[#0062cc] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#007AFF]/25 ios-press min-h-[44px]"
            >
              Claim Yearly Offer (₹1,799/yr)
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-[#8E8E93] font-medium flex items-center justify-center gap-1.5">
          <ShieldCheck className="size-4 text-[#34C759] shrink-0" />
          <span>100% Privacy: Customer mobile numbers & financial ledgers stay strictly confidential.</span>
        </div>
      </section>

      {/* 7. Footer & Trust */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-4 sm:px-6 text-xs border-t border-slate-800">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/icon-192.png"
              alt="My Mobile Shop"
              className="size-8 rounded-[10px] object-cover border border-white/10"
            />
            <div>
              <p className="font-bold text-white text-sm">My Mobile Shop</p>
              <p className="text-[11px] text-slate-400">Digital Day Book & Repair Counter Manager</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 text-xs font-medium">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#workflow" className="hover:text-white transition-colors">Routine</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <button
              type="button"
              onClick={() => navigate('/partner')}
              className="hover:text-white text-iosBlue font-bold transition-colors"
            >
              Partner Program
            </button>
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
              className="hover:text-white transition-colors flex items-center gap-1 text-slate-300"
            >
              <Mail className="size-3.5" />
              <span>support@mymobileshop.online</span>
            </a>
          </div>

          <p className="text-[11px] text-slate-500 text-center md:text-right">
            © {new Date().getFullYear()} My Mobile Shop. All rights reserved.
          </p>
        </div>
      </footer>

      {/* 8. iOS Mobile Floating Bottom Action Capsule (Thumb zone friendly) */}
      <div className="sm:hidden fixed bottom-3 left-3 right-3 z-40 bg-white/90 backdrop-blur-2xl p-2 rounded-2xl shadow-xl border border-black/5 flex items-center gap-2 safe-bottom">
        <button
          type="button"
          onClick={handleSignIn}
          className="flex-1 py-2.5 px-3 bg-[#F2F2F7] hover:bg-slate-200 text-slate-900 font-bold text-xs rounded-xl ios-press touch-manipulation text-center"
        >
          {isAuthenticated ? 'Open Shop' : 'Sign In'}
        </button>
        <button
          type="button"
          onClick={handleGetStarted}
          className="flex-[1.5] py-2.5 px-3 bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold text-xs rounded-xl shadow-md shadow-[#007AFF]/25 ios-press touch-manipulation flex items-center justify-center gap-1.5 text-center"
        >
          <span>{isAuthenticated ? 'Go to App' : 'Get Started'}</span>
          <ArrowRight className="size-3.5" />
        </button>
      </div>

      {/* Legal Modal */}
      <LegalModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        initialTab={legalTab}
      />
    </div>
  );
};
