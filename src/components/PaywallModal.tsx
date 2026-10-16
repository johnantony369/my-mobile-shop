import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Language } from '../types';
import { t } from '../i18n';
import { checkCode, formatActivationCode } from '../utils/activation';
import { updateAppSettings } from '../db/db';
import { isAndroidNativeApp, isiOSNativeApp } from '../utils/platform';
import {
  RC_MONTHLY_ID,
  RC_YEARLY_ID,
  getRevenueCatOfferings,
  purchaseRevenueCat,
  restoreRevenueCatPurchases,
  RCOffering,
} from '../utils/revenueCat';
import {
  Check,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  X,
  MessageCircle,
  KeyRound,
  Globe,
} from 'lucide-react';
import {
  CountryCode,
  PlanId,
  PRICING_CONFIG,
  formatPrice,
  calculateSavings,
  detectVisitorCountry,
  saveVisitorCountry,
  resolveVisitorCountry,
  STORAGE_KEY_COUNTRY,
} from '../utils/pricing';

const RAZORPAY_MONTHLY_URL = 'https://rzp.io/rzp/AIScmrWq';
const RAZORPAY_YEARLY_URL = 'https://rzp.io/rzp/EyBIPHa';

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
  const isAndroid = isAndroidNativeApp();
  const isIOS = isiOSNativeApp();
  const [rcOffering, setRcOffering] = useState<RCOffering>({});
  const [rcLoading, setRcLoading] = useState(false);
  const [rcError, setRcError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(() => detectVisitorCountry());
  const [cadenceTab, setCadenceTab] = useState<'recurring' | 'extended'>('recurring');
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('yearly');

  const handleCadenceChange = (tab: 'recurring' | 'extended') => {
    setCadenceTab(tab);
    if (tab === 'recurring' && selectedPlan !== 'monthly' && selectedPlan !== 'yearly') {
      setSelectedPlan('yearly');
    } else if (tab === 'extended' && (selectedPlan === 'monthly' || selectedPlan === 'yearly')) {
      setSelectedPlan('three_year');
    }
  };
  const [showCodeInput, setShowCodeInput] = useState(isAndroid);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && isIOS) {
      getRevenueCatOfferings().then(setRcOffering);
    }
  }, [isOpen, isIOS]);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_COUNTRY) : null;
      if (!saved) {
        resolveVisitorCountry().then((geoCountry) => {
          if (isMounted && geoCountry && !localStorage.getItem(STORAGE_KEY_COUNTRY)) {
            setSelectedCountry(geoCountry);
          }
        });
      }
    } catch {
      // ignore
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

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
        setRcError(null);
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

  const handleIOSPurchase = async () => {
    const packageId = selectedPlan === 'monthly' ? RC_MONTHLY_ID : RC_YEARLY_ID;
    setRcLoading(true);
    setRcError(null);
    const result = await purchaseRevenueCat(packageId);
    setRcLoading(false);
    if (result.success) {
      // Write to local DB — plan/expiry will be verified from RevenueCat on next launch
      await updateAppSettings({ activated: true, proPlan: result.plan ?? 'monthly', proExpiresAt: null });
      setActivationSuccess(true);
      if (onActivated) onActivated();
      setTimeout(() => onClose(), 1500);
    } else if (!result.cancelled) {
      setRcError('Purchase failed. Please try again or restore your purchases below.');
    }
  };

  const handleIOSRestore = async () => {
    setRestoring(true);
    setRcError(null);
    const hasEntitlement = await restoreRevenueCatPurchases();
    setRestoring(false);
    if (hasEntitlement) {
      await updateAppSettings({ activated: true, proPlan: 'yearly', proExpiresAt: null });
      setActivationSuccess(true);
      if (onActivated) onActivated();
      setTimeout(() => onClose(), 1500);
    } else {
      setRcError('No active purchases found on your Apple ID.');
    }
  };

  const handleOpenRazorpay = () => {
    if (selectedCountry === 'IN' && (selectedPlan === 'monthly' || selectedPlan === 'yearly')) {
      const url = selectedPlan === 'yearly' ? RAZORPAY_YEARLY_URL : RAZORPAY_MONTHLY_URL;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      const country = PRICING_CONFIG[selectedCountry] || PRICING_CONFIG.US;
      const plan = country.plans[selectedPlan];
      const formatted = formatPrice(plan.price, selectedCountry);
      const text = encodeURIComponent(`Hello, I want to activate My Mobile Shop Pro (${plan.name} - ${formatted} in ${country.countryName})`);
      window.open(`https://wa.me/919876543210?text=${text}`, '_blank', 'noopener,noreferrer');
    }
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
        className={`relative z-10 w-full max-w-lg mx-auto max-h-[90vh] max-h-[90dvh] bg-white rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${
          animate ? 'translate-y-0' : 'translate-y-full'
        } pb-[calc(env(safe-area-inset-bottom)+20px)] sm:pb-5`}
      >
        {/* Grab Handle & Close button */}
        <div className="shrink-0 relative pt-3.5 pb-1 flex items-center justify-center">
          <div className="w-10 h-1.5 bg-slate-300 rounded-full" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-3 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-1 pb-3 space-y-3.5 momentum-scroll overscroll-contain">
          {/* Header */}
          <div className="text-center pt-0.5">
            <img
              src="/icon-192.png"
              alt="My Mobile Shop"
              className="w-14 h-14 rounded-2xl mx-auto shadow-sm border border-slate-200/80 object-cover mb-2"
            />
            <h2 className="text-xl font-black text-slate-950 tracking-tight leading-tight">
              My Mobile Shop Pro
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5 max-w-xs mx-auto">
              Unlimited transactions, automatic cloud sync, and repair tracking
            </p>
          </div>

          {/* Market & Currency Selector (Strictly no emojis) */}
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="font-semibold text-slate-500 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-iosBlue" />
              <span>Market</span>
            </span>
            <div className="relative">
              <select
                value={selectedCountry}
                onChange={(e) => {
                  const code = e.target.value as CountryCode;
                  setSelectedCountry(code);
                  saveVisitorCountry(code);
                }}
                className="bg-slate-100 hover:bg-slate-200/70 border border-slate-200/90 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-iosBlue cursor-pointer transition-colors"
              >
                <option value="IN">India · INR</option>
                <option value="AE">UAE · AED</option>
                <option value="SA">Saudi Arabia · SAR</option>
                <option value="QA">Qatar · QAR</option>
                <option value="OM">Oman · OMR</option>
                <option value="BH">Bahrain · BHD</option>
                <option value="KW">Kuwait · KWD</option>
                <option value="US">International · USD</option>
              </select>
            </div>
          </div>

          {/* Direction 2: Cadence Segmented Switch */}
          <div className="p-1 bg-slate-100 rounded-xl border border-slate-200/90 flex text-xs font-bold">
            <button
              type="button"
              onClick={() => handleCadenceChange('recurring')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                cadenceTab === 'recurring'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Subscriptions
            </button>
            <button
              type="button"
              onClick={() => handleCadenceChange('extended')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                cadenceTab === 'extended'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Multi-Year & Lifetime
            </button>
          </div>

          {/* Tab 1: Subscriptions (Annual & Monthly) */}
          {cadenceTab === 'recurring' ? (
            <div className="space-y-2.5 pt-0.5">
              {/* Annual Pro Card (Recommended) */}
              {(() => {
                const planId: PlanId = 'yearly';
                const country = PRICING_CONFIG[selectedCountry] || PRICING_CONFIG.IN;
                const plan = country.plans[planId];
                const isSelected = selectedPlan === planId;
                const savings = calculateSavings(planId, selectedCountry);
                const annualMonthlyRate = Math.round(plan.price / 12);

                return (
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(planId)}
                    className={`w-full relative rounded-2xl p-4 text-left border-2 transition-all ${
                      isSelected
                        ? 'border-iosBlue bg-blue-50/50 shadow-sm ring-1 ring-iosBlue/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="absolute -top-2.5 right-3.5">
                      <span className="bg-iosBlue text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-xs tracking-wider">
                        Recommended
                      </span>
                    </div>

                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                          Annual Pro
                        </span>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-2xl font-black text-slate-900">
                            {formatPrice(plan.price, selectedCountry)}
                          </span>
                          <span className="text-xs text-slate-500 font-semibold">/ yr</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          {formatPrice(annualMonthlyRate, selectedCountry)}/mo
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-iosBlue font-bold mt-2">
                      {selectedCountry === 'IN'
                        ? 'Save ₹489 every year · 2 Months Free'
                        : savings && savings.savingsAmount > 0
                        ? `Save ${savings.savingsPercent}% · ${savings.formattedSavings} vs monthly`
                        : '12 months full counter access'}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Billed annually</span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected ? 'border-iosBlue bg-iosBlue text-white' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                  </button>
                );
              })()}

              {/* Monthly Pro Card */}
              {(() => {
                const planId: PlanId = 'monthly';
                const country = PRICING_CONFIG[selectedCountry] || PRICING_CONFIG.IN;
                const plan = country.plans[planId];
                const isSelected = selectedPlan === planId;

                return (
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(planId)}
                    className={`w-full relative rounded-2xl p-4 text-left border-2 transition-all ${
                      isSelected
                        ? 'border-iosBlue bg-blue-50/50 shadow-sm ring-1 ring-iosBlue/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                          Monthly Pro
                        </span>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-2xl font-black text-slate-900">
                            {formatPrice(plan.price, selectedCountry)}
                          </span>
                          <span className="text-xs text-slate-500 font-semibold">/ mo</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-slate-400">
                          Cancel anytime
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 font-medium mt-2">
                      Billed monthly · Flexible counter access
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Month-to-month</span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected ? 'border-iosBlue bg-iosBlue text-white' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                  </button>
                );
              })()}
            </div>
          ) : (
            /* Tab 2: Multi-Year & Lifetime (3-Year, 2-Year, Lifetime) */
            <div className="space-y-2.5 pt-0.5">
              {/* 3-Year Pro Card (Best Value) */}
              {(() => {
                const planId: PlanId = 'three_year';
                const country = PRICING_CONFIG[selectedCountry] || PRICING_CONFIG.IN;
                const plan = country.plans[planId];
                const isSelected = selectedPlan === planId;
                const savings = calculateSavings(planId, selectedCountry);
                const threeYearMonthly = Math.round(plan.price / 36);

                return (
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(planId)}
                    className={`w-full relative rounded-2xl p-3.5 text-left border-2 transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/40 shadow-sm ring-1 ring-amber-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="absolute -top-2.5 right-3.5">
                      <span className="bg-amber-600 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-xs tracking-wider">
                        Best Value
                      </span>
                    </div>

                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          3-Year Pro (36 Months)
                        </span>
                        <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
                          {formatPrice(threeYearMonthly, selectedCountry)}/mo
                          {savings && savings.savingsAmount > 0 ? ` · Save ${savings.formattedSavings}` : ''}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="text-base font-black text-slate-900">
                          {formatPrice(plan.price, selectedCountry)}
                        </span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })()}

              {/* 2-Year Pro Card */}
              {(() => {
                const planId: PlanId = 'two_year';
                const country = PRICING_CONFIG[selectedCountry] || PRICING_CONFIG.IN;
                const plan = country.plans[planId];
                const isSelected = selectedPlan === planId;
                const savings = calculateSavings(planId, selectedCountry);
                const twoYearMonthly = Math.round(plan.price / 24);

                return (
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(planId)}
                    className={`w-full relative rounded-2xl p-3.5 text-left border-2 transition-all ${
                      isSelected
                        ? 'border-iosBlue bg-blue-50/40 shadow-sm ring-1 ring-iosBlue/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          2-Year Pro (24 Months)
                        </span>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {formatPrice(twoYearMonthly, selectedCountry)}/mo
                          {savings && savings.savingsAmount > 0 ? ` · Save ${savings.formattedSavings}` : ''}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="text-base font-black text-slate-900">
                          {formatPrice(plan.price, selectedCountry)}
                        </span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected ? 'border-iosBlue bg-iosBlue text-white' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })()}

              {/* Lifetime Pro Card */}
              {(() => {
                const planId: PlanId = 'lifetime';
                const country = PRICING_CONFIG[selectedCountry] || PRICING_CONFIG.IN;
                const plan = country.plans[planId];
                const isSelected = selectedPlan === planId;

                return (
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(planId)}
                    className={`w-full relative rounded-2xl p-3.5 text-left border-2 transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-50 shadow-sm ring-1 ring-slate-900/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">
                            Lifetime Pro
                          </span>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-800">
                            One-Time
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Single payment · Permanent product-lifetime access
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="text-base font-black text-slate-900">
                          {formatPrice(plan.price, selectedCountry)}
                        </span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })()}
            </div>
          )}

          {/* Action Area */}
          {isIOS ? (
            <div className="space-y-3 pt-1">
              {/* Subscribe button */}
              <button
                type="button"
                onClick={handleIOSPurchase}
                disabled={rcLoading || activationSuccess}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-iosBlue via-blue-600 to-indigo-600 text-white rounded-[14px] font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {rcLoading ? (
                  <span>Processing...</span>
                ) : activationSuccess ? (
                  <><CheckCircle2 className="w-5 h-5" /><span>Subscribed!</span></>
                ) : (
                  <span>
                    {selectedPlan === 'yearly'
                      ? `Subscribe • ${rcOffering.yearly?.priceString ?? '₹2,499/yr'}`
                      : `Subscribe • ${rcOffering.monthly?.priceString ?? '₹249/mo'}`}
                  </span>
                )}
              </button>

              {rcError && (
                <p className="text-xs text-iosRed font-medium text-center">{rcError}</p>
              )}

              {/* Trust note */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#8E8E93]">
                  <ShieldCheck className="w-3.5 h-3.5 text-iosGreen" />
                  <span>Billed via Apple · Manage in App Store</span>
                </div>
              </div>

              {/* Restore Purchases — Apple requires this */}
              <button
                type="button"
                onClick={handleIOSRestore}
                disabled={restoring}
                className="w-full py-2 text-xs font-semibold text-iosBlue hover:opacity-80 transition-opacity disabled:opacity-50 text-center"
              >
                {restoring ? 'Restoring...' : 'Restore Purchases'}
              </button>

              {/* Activation code — collapsible, same as web */}
              <div className="border-t border-[#E5E5EA] pt-2.5">
                <button
                  type="button"
                  onClick={() => setShowCodeInput(!showCodeInput)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-iosBlue py-1 px-1 hover:opacity-80 transition-opacity"
                >
                  <span>{t('paywall_have_code', language)}</span>
                  {showCodeInput ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showCodeInput && (
                  <form onSubmit={handleActivateWithCode} className="mt-2 space-y-2.5 animate-fade-slide-in">
                    <input
                      type="text"
                      maxLength={19}
                      value={code}
                      onChange={handleCodeChange}
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2.5 text-center font-mono tracking-widest text-[15px] font-semibold text-black uppercase focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.06]"
                    />
                    {codeError && <p className="text-xs text-iosRed font-medium text-center">{codeError}</p>}
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
            </div>
          ) : isAndroid ? (
            <div className="space-y-3 pt-1">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 leading-relaxed">
                <KeyRound className="w-4 h-4 text-iosBlue shrink-0 mt-0.5" />
                <div>
                  <strong>Redeem License Code:</strong> Enter the activation code provided with your Pro plan purchase to unlock unlimited entries.
                </div>
              </div>

              {/* Direct Code Input on Android */}
              <form onSubmit={handleActivateWithCode} className="space-y-2.5">
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
                  className="w-full py-3 bg-iosBlue text-white font-bold text-sm rounded-[12px] active:scale-[0.98] shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isActivating ? 'Verifying...' : t('paywall_verify_btn', language)}</span>
                </button>
              </form>

              {/* WhatsApp Support Assistance */}
              <div className="pt-0.5">
                <a
                  href="https://wa.me/919876543210?text=Hello%2C%20I%20want%20to%20activate%20My%20Mobile%20Shop%20Pro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>Contact Support for Pro License</span>
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Web Action Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleOpenRazorpay}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-iosBlue via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-[14px] font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all"
                >
                  <span>
                    {selectedCountry === 'IN' && selectedPlan === 'yearly'
                      ? 'Subscribe • ₹2,499 / year'
                      : selectedCountry === 'IN' && selectedPlan === 'monthly'
                      ? 'Subscribe • ₹249 / month'
                      : `Subscribe • ${formatPrice(PRICING_CONFIG[selectedCountry]?.plans[selectedPlan]?.price || 0, selectedCountry)}${selectedPlan === 'lifetime' ? ' (One-time)' : ''}`}
                  </span>
                  <ExternalLink className="w-4 h-4 ml-0.5 opacity-80" />
                </button>
              </div>

              {/* Trust note */}
              <div className="text-center pt-0.5">
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#8E8E93]">
                  <ShieldCheck className="w-3.5 h-3.5 text-iosGreen" />
                  <span>
                    {selectedCountry === 'IN' && (selectedPlan === 'monthly' || selectedPlan === 'yearly')
                      ? '100% Secure via Razorpay (UPI, GPay, Cards)'
                      : `Secure direct activation for ${PRICING_CONFIG[selectedCountry]?.countryName || 'GCC'}`}
                  </span>
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
            </>
          )}

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
