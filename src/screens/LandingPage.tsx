import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Calendar,
  Users,
  Receipt,
  ArrowRight,
  CheckCircle2,
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
    <div className="min-h-screen bg-[#F6F5F3] text-[#171717] font-sans selection:bg-[#171717]/10 pb-20 sm:pb-0 overflow-x-hidden">
      {/* 1. Navbar */}
      <header className="sticky top-0 z-40 bg-[#F6F5F3]/90 backdrop-blur-md border-b border-black/[0.05]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-[10px] bg-[#171717] text-white flex items-center justify-center font-black text-sm">
              S
            </div>
            <span className="text-lg font-black tracking-tight text-[#171717]">MySalon</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSignIn}
              className="px-3 py-2 text-xs font-bold text-[#6B6B6B] hover:text-[#171717] rounded-lg transition-colors"
            >
              {isAuthenticated ? 'Open Salon' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={handleGetStarted}
              className="px-4 py-2 bg-[#171717] hover:bg-[#2C2C2E] active:scale-95 text-white text-xs font-bold rounded-full shadow-xs transition-all flex items-center gap-1.5"
            >
              <span>{isAuthenticated ? 'Dashboard' : 'Get Started'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero */}
      <section className="pt-10 pb-16 px-4 sm:px-6 max-w-4xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-black/[0.06] text-[#171717] text-xs font-bold shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#171717]" />
          <span>Simple salon management for your business</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-[#171717] tracking-tight leading-[1.15] max-w-2xl mx-auto">
          Manage your salon without notebooks and confusion.
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-[#6B6B6B] max-w-xl mx-auto font-medium leading-relaxed">
          Fast appointments, customer visit histories, staff schedules, and 1-tap WhatsApp receipts—built for beauty parlours and salons in Kerala.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-xs sm:max-w-none mx-auto">
          <button
            type="button"
            onClick={handleGetStarted}
            className="w-full sm:w-auto px-6 py-3.5 bg-[#171717] hover:bg-[#2C2C2E] text-white text-sm font-bold rounded-[16px] shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>Start 14-Day Free Trial</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleSignIn}
            className="w-full sm:w-auto px-5 py-3.5 bg-white text-[#171717] text-sm font-bold rounded-[16px] border border-black/[0.08] shadow-2xs hover:bg-gray-50 active:scale-95 transition-all"
          >
            Existing Salon Login
          </button>
        </div>

        {/* Hero Card Mockup */}
        <div className="pt-8 max-w-md mx-auto">
          <div className="bg-white rounded-[22px] border border-black/[0.06] shadow-xl p-5 text-left space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.04]">
              <div>
                <h4 className="font-extrabold text-[16px] text-[#171717]">Glow Studio</h4>
                <p className="text-xs text-[#8E8E93]">Today's Appointments (5)</p>
              </div>
              <span className="text-xs font-bold text-[#1E7E34] bg-[#EBF7EE] px-2.5 py-1 rounded-full">
                Revenue: ₹3,850
              </span>
            </div>

            <div className="p-3 bg-[#F6F5F3] rounded-[14px] flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-[#171717] block">10:00 AM • Anu</span>
                <span className="text-[#6B6B6B]">Haircut + Facial (Anjali)</span>
              </div>
              <span className="font-bold text-[#171717]">₹850</span>
            </div>

            <div className="p-3 bg-[#F6F5F3] rounded-[14px] flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-[#171717] block">11:30 AM • Rahul</span>
                <span className="text-[#6B6B6B]">Haircut (Neha)</span>
              </div>
              <span className="font-bold text-[#171717]">₹350</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Features */}
      <section className="py-12 bg-white border-y border-black/[0.05] px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
              Designed for salon owners, not IT experts.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-[18px] bg-[#F6F5F3] space-y-2">
              <Calendar className="w-6 h-6 text-[#171717]" />
              <h3 className="font-bold text-[16px]">Fast Appointments</h3>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                Book a customer in under 30 seconds with selected service, staff member and time slot.
              </p>
            </div>

            <div className="p-5 rounded-[18px] bg-[#F6F5F3] space-y-2">
              <Users className="w-6 h-6 text-[#171717]" />
              <h3 className="font-bold text-[16px]">Customer Histories</h3>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                Scan past visits, favorite styles, allergies and total spent with a single tap.
              </p>
            </div>

            <div className="p-5 rounded-[18px] bg-[#F6F5F3] space-y-2">
              <Receipt className="w-6 h-6 text-[#171717]" />
              <h3 className="font-bold text-[16px]">Fast Billing & WhatsApp</h3>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                Collect Cash, UPI, or Card and send modern WhatsApp receipts directly to clients.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Pricing */}
      <section className="py-14 px-4 sm:px-6 max-w-md mx-auto text-center space-y-4">
        <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">
          Pricing
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-[#171717]">Simple, Transparent Plans</h2>

        <div className="p-6 bg-white rounded-[22px] border border-black/[0.08] shadow-lg text-left space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#171717] text-lg">MySalon Pro</span>
            <span className="bg-[#EBF7EE] text-[#1E7E34] text-xs font-bold px-2.5 py-0.5 rounded-full">
              14-Day Free Trial
            </span>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-[#171717]">₹199</span>
            <span className="text-xs text-[#8E8E93] font-semibold">/ month</span>
            <span className="text-xs text-[#6B6B6B] ml-2 font-medium">or ₹1,999 / year</span>
          </div>

          <ul className="space-y-2 text-xs text-[#4A4A4A] font-medium pt-2">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
              <span>Unlimited appointments & customers</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
              <span>Services menu & staff management</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
              <span>100% offline-first + secure cloud sync</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
              <span>Instant WhatsApp receipts & reports</span>
            </li>
          </ul>

          <button
            type="button"
            onClick={handleGetStarted}
            className="w-full py-3 bg-[#171717] hover:bg-[#2C2C2E] active:scale-95 text-white rounded-[14px] text-xs font-bold shadow-sm transition-all text-center"
          >
            Start 14-Day Free Trial
          </button>
        </div>
      </section>

      {/* 5. Footer */}
      <footer className="py-8 border-t border-black/[0.06] text-center text-xs text-[#8E8E93] space-y-2">
        <p>© {new Date().getFullYear()} MySalon. Simple salon management for Kerala businesses.</p>
        <div className="flex justify-center gap-4 text-xs font-medium text-[#6B6B6B]">
          <button type="button" onClick={() => handleOpenLegal('privacy')}>
            Privacy Policy
          </button>
          <button type="button" onClick={() => handleOpenLegal('terms')}>
            Terms of Service
          </button>
        </div>
      </footer>

      <LegalModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        initialTab={legalTab}
      />
    </div>
  );
};
