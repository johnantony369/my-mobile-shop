import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { t } from '../i18n';
import { checkCode, formatActivationCode } from '../utils/activation';
import { updateAppSettings } from '../db/db';
import {
  Crown,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Cloud,
  Wrench,
  FileSpreadsheet,
  Zap,
  Lock,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

const RAZORPAY_PAYMENT_URL = 'https://rzp.io/rzp/sm5XWYc';

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
  trialDaysRemaining,
}) => {
  const [rendered, setRendered] = useState(isOpen);
  const [animate, setAnimate] = useState(false);
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
    window.open(RAZORPAY_PAYMENT_URL, '_blank', 'noopener,noreferrer');
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
      await updateAppSettings({ activated: true });
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

  const features = [
    {
      icon: <Zap className="w-4 h-4 text-amber-500" />,
      title: t('paywall_feature_1', language),
    },
    {
      icon: <Cloud className="w-4 h-4 text-iosBlue" />,
      title: t('paywall_feature_2', language),
    },
    {
      icon: <Wrench className="w-4 h-4 text-indigo-500" />,
      title: t('paywall_feature_3', language),
    },
    {
      icon: <FileSpreadsheet className="w-4 h-4 text-emerald-500" />,
      title: t('paywall_feature_4', language),
    },
    {
      icon: <Sparkles className="w-4 h-4 text-purple-500" />,
      title: t('paywall_feature_5', language),
    },
    {
      icon: <Lock className="w-4 h-4 text-slate-500" />,
      title: t('paywall_feature_6', language),
    },
  ];

  return (
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
        className={`relative z-10 w-full max-w-lg mx-auto max-h-[92vh] bg-white rounded-t-[22px] shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${
          animate ? 'translate-y-0' : 'translate-y-full'
        } pb-[calc(env(safe-area-inset-bottom)+12px)]`}
      >
        {/* Grab Handle & Close button */}
        <div className="relative pt-3 pb-2 flex items-center justify-center">
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

        {/* Scrollable Container */}
        <div className="overflow-y-auto px-5 pt-1 pb-4 space-y-4">
          {/* Header Crown & Title */}
          <div className="text-center pt-1">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 shadow-md shadow-amber-500/20 text-white mb-2.5">
              <Crown className="w-8 h-8 drop-shadow-sm" />
            </div>

            <div className="inline-block mb-1">
              <span className="px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                {t('paywall_tagline', language)}
              </span>
            </div>

            <h2 className="text-[22px] font-extrabold text-black tracking-tight leading-tight">
              {t('paywall_title', language)}
            </h2>

            <p className="text-xs text-[#8E8E93] font-medium mt-1 max-w-xs mx-auto">
              {t('paywall_subtitle', language)}
            </p>

            {typeof trialDaysRemaining === 'number' && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-iosBlue border border-blue-100">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  {trialDaysRemaining > 0
                    ? t('trial_days_remaining', language, { days: trialDaysRemaining })
                    : t('trial_expired', language)}
                </span>
              </div>
            )}
          </div>

          {/* Value Pillars List */}
          <div className="bg-[#F2F2F7] rounded-[16px] p-3.5 space-y-2.5 border border-black/[0.04]">
            {features.map((feat, idx) => (
              <div key={idx} className="flex items-start space-x-2.5">
                <div className="p-1 rounded-lg bg-white shadow-xs shrink-0 mt-0.5">
                  {feat.icon}
                </div>
                <div className="flex-1 flex items-start justify-between">
                  <span className="text-[13px] font-semibold text-slate-800 leading-snug">
                    {feat.title}
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-iosGreen shrink-0 ml-2 mt-0.5" />
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Highlight Card */}
          <div className="rounded-[16px] p-4 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-blue-50 border border-blue-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-iosBlue uppercase tracking-wider">
                {t('paywall_pricing_badge', language)}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-iosGreen text-white uppercase tracking-wider">
                Lifetime
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                One-Time Payment
              </span>
            </div>

            <p className="text-[12px] text-slate-600 mt-1 leading-snug">
              {language === 'ml'
                ? 'മാസാമാസം നൽകേണ്ടതില്ല. ഒരിക്കൽ അടച്ചാൽ നിങ്ങളുടെ കടയിൽ ആജീവനാന്തം ഉപയോഗിക്കാം.'
                : 'No monthly or annual subscription fees. Pay once and use forever.'}
            </p>

            {/* Direct Razorpay Checkout Button */}
            <button
              type="button"
              onClick={handleOpenRazorpay}
              className="w-full mt-3 py-3.5 px-4 bg-gradient-to-r from-iosBlue via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-[12px] font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{t('paywall_cta', language)}</span>
              <ExternalLink className="w-4 h-4 ml-0.5 opacity-80" />
            </button>
          </div>

          {/* Trust & Payment Methods */}
          <div className="text-center space-y-1.5 pt-1">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#8E8E93]">
              <ShieldCheck className="w-3.5 h-3.5 text-iosGreen" />
              <span>{t('paywall_secure_note', language)}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              <span className="px-2 py-0.5 bg-gray-100 rounded-md">UPI</span>
              <span className="px-2 py-0.5 bg-gray-100 rounded-md">GPay</span>
              <span className="px-2 py-0.5 bg-gray-100 rounded-md">PhonePe</span>
              <span className="px-2 py-0.5 bg-gray-100 rounded-md">Cards</span>
              <span className="px-2 py-0.5 bg-gray-100 rounded-md">NetBanking</span>
            </div>
          </div>

          {/* Collapsible: Already paid? Enter Activation Code */}
          <div className="border-t border-[#E5E5EA] pt-3">
            <button
              type="button"
              onClick={() => setShowCodeInput(!showCodeInput)}
              className="w-full flex items-center justify-between text-xs font-semibold text-iosBlue py-1.5 px-1 hover:opacity-80 transition-opacity"
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
          <div className="pt-1 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs font-medium text-[#8E8E93] hover:text-black transition-colors text-center"
            >
              {t('paywall_close', language)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
