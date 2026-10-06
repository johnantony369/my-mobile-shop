import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Language } from '../types';
import { checkCode, formatActivationCode } from '../utils/activation';
import { updateAppSettings } from '../db/db';
import {
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
  onActivated?: () => void;
  trialDaysRemaining?: number;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  onActivated,
  trialDaysRemaining,
}) => {
  const [rendered, setRendered] = useState(isOpen);
  const [animate, setAnimate] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
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

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatActivationCode(e.target.value);
    setCode(formatted);
    setCodeError(null);
  };

  const handleActivateWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      setCodeError('Enter a valid activation code');
      return;
    }

    setIsActivating(true);
    if (checkCode(code)) {
      await updateAppSettings({ activated: true, proPlan: 'lifetime', proExpiresAt: null });
      setActivationSuccess(true);
      setCodeError(null);
      if (onActivated) onActivated();
      setTimeout(() => onClose(), 1500);
    } else {
      setCodeError('Invalid code. Please check and try again.');
    }
    setIsActivating(false);
  };

  const sheetElement = (
    <div className="fixed inset-0 z-50 flex flex-col justify-end select-none">
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-[3px] transition-opacity duration-250 ease-out ${
          animate ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div
        className={`relative z-10 w-full max-w-lg mx-auto bg-white rounded-t-[24px] shadow-2xl flex flex-col overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${
          animate ? 'translate-y-0' : 'translate-y-full'
        } pb-[calc(env(safe-area-inset-bottom)+16px)]`}
      >
        <div className="pt-3 pb-1 flex items-center justify-center relative">
          <div className="w-10 h-1.5 bg-[#C7C7CC] rounded-full" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-3 w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#8E8E93] hover:text-[#171717]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-2 pb-3 space-y-4">
          <div className="text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
              Simple Salon Management
            </span>
            <h2 className="text-[22px] font-black text-[#171717] tracking-tight mt-0.5">
              Unlock MySalon Pro
            </h2>
            <p className="text-xs text-[#6B6B6B] mt-1 max-w-xs mx-auto">
              Unlimited appointments, visit history tracking, staff management and cloud sync.
            </p>
            {trialDaysRemaining !== undefined && trialDaysRemaining > 0 && (
              <div className="mt-2 inline-block bg-[#F3E5E5] text-[#9E4A4A] text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                {trialDaysRemaining} days remaining in trial
              </div>
            )}
          </div>

          {/* Pricing Selector */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedPlan('monthly')}
              className={`p-3.5 rounded-[16px] text-left border-2 transition-all flex flex-col justify-between ${
                selectedPlan === 'monthly'
                  ? 'border-[#171717] bg-[#F6F5F3]'
                  : 'border-black/[0.06] bg-white'
              }`}
            >
              <div>
                <span className="text-[11px] font-bold text-[#6B6B6B] uppercase">Monthly</span>
                <div className="mt-1 flex items-baseline gap-0.5">
                  <span className="text-2xl font-black text-[#171717]">₹199</span>
                  <span className="text-xs text-[#8E8E93]">/mo</span>
                </div>
              </div>
              <span className="text-[11px] text-[#6B6B6B] mt-2 font-medium">Billed monthly</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlan('yearly')}
              className={`p-3.5 rounded-[16px] text-left border-2 transition-all flex flex-col justify-between relative ${
                selectedPlan === 'yearly'
                  ? 'border-[#171717] bg-[#F6F5F3]'
                  : 'border-black/[0.06] bg-white'
              }`}
            >
              <div className="absolute -top-2.5 right-2 bg-[#1E7E34] text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">
                Save ₹389
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#6B6B6B] uppercase">Yearly</span>
                <div className="mt-1 flex items-baseline gap-0.5">
                  <span className="text-2xl font-black text-[#171717]">₹1,999</span>
                  <span className="text-xs text-[#8E8E93]">/yr</span>
                </div>
              </div>
              <span className="text-[11px] text-[#1E7E34] mt-2 font-bold">Best value</span>
            </button>
          </div>

          {/* Subscription Action */}
          <button
            type="button"
            onClick={async () => {
              // Direct toggle activation for MVP / future UPI hook
              await updateAppSettings({ activated: true, proPlan: selectedPlan });
              if (onActivated) onActivated();
              onClose();
            }}
            className="w-full py-3.5 bg-[#171717] hover:bg-[#2C2C2E] active:scale-95 text-white rounded-[14px] font-bold text-[15px] shadow-sm transition-all"
          >
            {selectedPlan === 'yearly' ? 'Activate Yearly • ₹1,999' : 'Activate Monthly • ₹199'}
          </button>

          {/* Activation Code Accordion */}
          <div className="pt-1 border-t border-black/[0.04]">
            <button
              type="button"
              onClick={() => setShowCodeInput(!showCodeInput)}
              className="w-full flex items-center justify-between text-xs font-semibold text-[#6B6B6B] py-1"
            >
              <span>Already have an activation code?</span>
              {showCodeInput ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showCodeInput && (
              <form onSubmit={handleActivateWithCode} className="mt-2 space-y-2">
                <input
                  type="text"
                  maxLength={19}
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className="w-full bg-[#F6F5F3] rounded-[10px] px-3 py-2 text-center font-mono tracking-widest text-[15px] font-bold uppercase focus:outline-none"
                />
                {codeError && (
                  <p className="text-xs text-[#D32F2F] font-semibold text-center">{codeError}</p>
                )}
                {activationSuccess && (
                  <p className="text-xs text-[#1E7E34] font-semibold text-center">
                    Activated successfully!
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isActivating || activationSuccess}
                  className="w-full py-2.5 bg-[#171717] text-white text-xs font-bold rounded-[10px]"
                >
                  Verify & Activate
                </button>
              </form>
            )}
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
