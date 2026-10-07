import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Language } from '../types';
import { t } from '../i18n';
import { checkCode, formatActivationCode } from '../utils/activation';
import { updateAppSettings } from '../db/db';
import {
  Check,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

const RAZORPAY_MONTHLY_URL = 'https://rzp.io/rzp/LHFKoCZ';
const RAZORPAY_YEARLY_URL = 'https://rzp.io/rzp/2ZGyPsBK';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onActivated?: () => void;
  trialDaysRemaining?: number;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  language,
  onActivated,
}) => {
  const [rendered, setRendered] = useState(isOpen);
  const [animate, setAnimate] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      const timer = setTimeout(() => setAnimate(true), 20);
      return () => clearTimeout(timer);
    } else {
      setAnimate(false);
      const timer = setTimeout(() => {
        setRendered(false);
        setShowCodeInput(false);
        setCode('');
        setCodeError(null);
        setActivationSuccess(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!rendered) return null;

  const handleOpenRazorpay = () => {
    const url = selectedPlan === 'yearly' ? RAZORPAY_YEARLY_URL : RAZORPAY_MONTHLY_URL;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatActivationCode(e.target.value);
    setCode(formatted);
    setCodeError(null);
  };

  const handleActivateWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      setCodeError(t('invalid_code_error', language));
      return;
    }

    setIsActivating(true);
    if (checkCode(code)) {
      await updateAppSettings({ activated: true, proPlan: 'lifetime', proExpiresAt: null });
      setActivationSuccess(true);
      setCodeError(null);
      if (onActivated) {
        onActivated();
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setCodeError(t('invalid_code_error', language));
    }
    setIsActivating(false);
  };

  const sheetElement = (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-[4px] transition-opacity duration-250 ease-out ${
          animate ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sheet Content */}
      <div
        className={`relative z-10 w-full max-w-lg mx-auto max-h-[90vh] max-h-[90dvh] bg-white rounded-t-[24px] shadow-2xl flex flex-col overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${
          animate ? 'translate-y-0' : 'translate-y-full'
        } pb-[calc(env(safe-area-inset-bottom)+14px)]`}
      >
        {/* Grab Handle & Close button */}
        <div className="shrink-0 relative pt-3 pb-1 flex items-center justify-center">
          <div className="w-10 h-1.5 bg-[#C7C7CC] rounded-full" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-3 w-8 h-8 rounded-full bg-[#E5E5EA]/80 hover:bg-[#E5E5EA] flex items-center justify-center text-[#8E8E93] hover:text-black transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-1 pb-3 space-y-4 momentum-scroll overscroll-contain">
          {/* App Logo & Title */}
          <div className="text-center pt-1">
            <img
              src="/icon-192.png"
              alt="My Mobile Shop"
              className="w-16 h-16 rounded-2xl mx-auto shadow-md border border-black/5 object-cover mb-2.5"
            />
            <h2 className="text-[22px] font-black text-black tracking-tight leading-tight">
              My Mobile Shop Pro
            </h2>
            <p className="text-xs text-[#8E8E93] font-medium mt-1 max-w-xs mx-auto">
              Unlimited transactions, automatic cloud sync, and repair tracking
            </p>
          </div>

          {/* Pricing Plans Selection */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Monthly Card */}
            <button
              type="button"
              onClick={() => setSelectedPlan('monthly')}
              className={`relative rounded-[16px] p-3.5 text-left border-2 transition-all flex flex-col justify-between ${
                selectedPlan === 'monthly'
                  ? 'border-iosBlue bg-blue-50/60 shadow-sm'
                  : 'border-black/[0.08] bg-[#F2F2F7]/70 hover:bg-[#F2F2F7]'
              }`}
            >
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Monthly
                </span>
                <div className="mt-1 flex items-baseline gap-0.5">
                  <span className="text-2xl font-black text-black">₹249</span>
                  <span className="text-xs text-slate-500 font-semibold">/mo</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 font-medium">
                Billed monthly
              </p>
              <div
                className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${
                  selectedPlan === 'monthly' ? 'text-iosBlue' : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                    selectedPlan === 'monthly'
                      ? 'border-iosBlue bg-iosBlue text-white'
                      : 'border-slate-300'
                  }`}
                >
                  {selectedPlan === 'monthly' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <span>{selectedPlan === 'monthly' ? 'Selected' : 'Select'}</span>
              </div>
            </button>

            {/* Yearly Card */}
            <button
              type="button"
              onClick={() => setSelectedPlan('yearly')}
              className={`relative rounded-[16px] p-3.5 text-left border-2 transition-all flex flex-col justify-between ${
                selectedPlan === 'yearly'
                  ? 'border-iosBlue bg-blue-50/60 shadow-sm ring-1 ring-iosBlue/20'
                  : 'border-black/[0.08] bg-[#F2F2F7]/70 hover:bg-[#F2F2F7]'
              }`}
            >
              {/* Savings badge */}
              <div className="absolute -top-2.5 right-3">
                <span className="bg-gradient-to-r from-emerald-500 to-iosGreen text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-xs">
                  Save 16%
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Yearly
                </span>
                <div className="mt-1 flex items-baseline gap-0.5">
                  <span className="text-2xl font-black text-black">₹2,499</span>
                  <span className="text-xs text-slate-500 font-semibold">/yr</span>
                </div>
              </div>
              <p className="text-[11px] text-iosGreen font-bold mt-2">
                ₹208/mo • Best Value
              </p>
              <div
                className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${
                  selectedPlan === 'yearly' ? 'text-iosBlue' : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                    selectedPlan === 'yearly'
                      ? 'border-iosBlue bg-iosBlue text-white'
                      : 'border-slate-300'
                  }`}
                >
                  {selectedPlan === 'yearly' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <span>{selectedPlan === 'yearly' ? 'Selected' : 'Select'}</span>
              </div>
            </button>
          </div>

          {/* Action Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleOpenRazorpay}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-iosBlue via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-[14px] font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all"
            >
              <span>
                {selectedPlan === 'yearly' ? 'Subscribe • ₹2,499 / year' : 'Subscribe • ₹249 / month'}
              </span>
              <ExternalLink className="w-4 h-4 ml-0.5 opacity-80" />
            </button>
          </div>

          {/* Trust note */}
          <div className="text-center pt-0.5">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#8E8E93]">
              <ShieldCheck className="w-3.5 h-3.5 text-iosGreen" />
              <span>100% Secure via Razorpay (UPI, GPay, Cards)</span>
            </div>
          </div>

          {/* Collapsible: Already paid? Enter Activation Code */}
          <div className="border-t border-[#E5E5EA] pt-2.5">
            <button
              type="button"
              onClick={() => setShowCodeInput(!showCodeInput)}
              className="w-full flex items-center justify-between text-xs font-semibold text-iosBlue py-1 px-1 hover:opacity-80 transition-opacity"
            >
              <span>{t('paywall_have_code', language)}</span>
              {showCodeInput ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showCodeInput && (
              <form onSubmit={handleActivateWithCode} className="mt-2 space-y-2.5 animate-fade-slide-in">
                <div>
                  <input
                    type="text"
                    maxLength={19}
                    value={code}
                    onChange={handleCodeChange}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2.5 text-center font-mono tracking-widest text-[15px] font-semibold text-black uppercase focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.06]"
                  />
                </div>

                {codeError && (
                  <p className="text-xs text-iosRed font-medium text-center">
                    {codeError}
                  </p>
                )}

                {activationSuccess && (
                  <div className="p-2.5 bg-green-50 text-iosGreen border border-green-200 rounded-[10px] text-xs font-semibold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('activated_success_msg', language)}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isActivating || activationSuccess}
                  className="w-full py-2.5 bg-iosBlue text-white font-semibold text-xs rounded-[10px] active:opacity-85 shadow-sm transition-opacity disabled:opacity-50"
                >
                  {isActivating ? 'Verifying...' : t('paywall_verify_btn', language)}
                </button>
              </form>
            )}
          </div>

          {/* Dismiss button */}
          <div className="pt-0 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-1.5 text-xs font-medium text-[#8E8E93] hover:text-black transition-colors text-center"
            >
              {t('paywall_close', language)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(sheetElement, document.body);
  }
  return sheetElement;
};
