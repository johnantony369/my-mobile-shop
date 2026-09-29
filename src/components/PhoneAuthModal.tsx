import React, { useState, useRef, useEffect } from 'react';
import { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { createRecaptchaVerifier, sendOtp, confirmOtp } from '../firebase/auth';
import { X, Phone, KeyRound, Loader2, AlertCircle } from 'lucide-react';

interface PhoneAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  language?: 'ml' | 'en';
}

export function PhoneAuthModal({
  isOpen,
  onClose,
  onSuccess,
  language = 'en',
}: PhoneAuthModalProps) {
  const isMl = language === 'ml';
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep('phone');
      setPhoneNumber('');
      setOtpCode('');
      setError(null);
      setLoading(false);
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // Ignore clear error
        }
        recaptchaVerifierRef.current = null;
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = phoneNumber.replace(/\D/g, '');
    if (clean.length < 10) {
      setError(isMl ? 'സാധുവായ ഫോൺ നമ്പർ നൽകുക' : 'Please enter a valid 10-digit mobile number');
      return;
    }

    const formatted = clean.length === 10 ? `+91${clean}` : `+${clean}`;

    try {
      setLoading(true);
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = createRecaptchaVerifier('recaptcha-container');
      }
      const confirmation = await sendOtp(formatted, recaptchaVerifierRef.current);
      confirmationRef.current = confirmation;
      setStep('otp');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('invalid-phone-number')) {
        setError(isMl ? 'തെറ്റായ ഫോൺ നമ്പർ' : 'Invalid phone number format');
      } else if (msg.includes('quota-exceeded')) {
        setError(isMl ? 'SMS ക്വാട്ട കഴിഞ്ഞു' : 'SMS quota exceeded. Please try Google Sign-In.');
      } else {
        setError(msg || (isMl ? 'OTP അയക്കുന്നതിൽ പരാജയപ്പെട്ടു' : 'Failed to send OTP'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationRef.current) return;
    setError(null);

    if (otpCode.length !== 6) {
      setError(isMl ? '6 അക്ക OTP നൽകുക' : 'Enter 6-digit OTP code');
      return;
    }

    try {
      setLoading(true);
      await confirmOtp(confirmationRef.current, otpCode);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('invalid-verification-code')) {
        setError(isMl ? 'തെറ്റായ OTP' : 'Invalid verification code. Please check and retry.');
      } else {
        setError(msg || (isMl ? 'സ്ഥിരീകരണം പരാജയപ്പെട്ടു' : 'Verification failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative border border-slate-200 dark:border-slate-800">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5 text-center">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
            {step === 'phone' ? <Phone className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {step === 'phone'
              ? isMl
                ? 'ഫോൺ നമ്പർ നൽകുക'
                : 'Sign in with Phone'
              : isMl
              ? 'OTP നൽകുക'
              : 'Enter Verification Code'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {step === 'phone'
              ? isMl
                ? 'നിങ്ങളുടെ ഡാറ്റ സുരക്ഷിതമായി സൂക്ഷിക്കാൻ OTP അയക്കും'
                : 'We will send a 6-digit OTP to verify your shop number'
              : isMl
              ? `${phoneNumber} ലേക്ക് അയച്ച OTP നൽകുക`
              : `Enter the 6-digit code sent to ${phoneNumber}`}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                {isMl ? 'മൊബൈൽ നമ്പർ' : 'Mobile Number'}
              </label>
              <div className="flex items-center gap-2 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-blue-500">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">+91</span>
                <input
                  type="tel"
                  placeholder="9876543210"
                  maxLength={10}
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Invisible reCAPTCHA container */}
            <div id="recaptcha-container" />

            <button
              type="submit"
              disabled={loading || phoneNumber.length < 10}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isMl ? 'OTP അയക്കുക' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                {isMl ? '6-അക്ക OTP കോഡ്' : '6-digit OTP Code'}
              </label>
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full tracking-widest text-center text-lg font-bold border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('phone')}
                disabled={loading}
                className="w-1/3 py-3 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {isMl ? 'തിരികെ' : 'Back'}
              </button>
              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-2/3 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isMl ? 'സ്ഥിരീകരിക്കുക' : 'Verify & Sign In'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
