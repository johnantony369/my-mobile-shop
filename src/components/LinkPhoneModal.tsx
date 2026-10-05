import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { createRecaptchaVerifier, sendLinkPhoneOtp, confirmLinkPhoneOtp } from '../firebase/auth';
import { X, Phone, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LinkPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: User;
}

export const LinkPhoneModal: React.FC<LinkPhoneModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user,
}) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep('phone');
      setPhoneNumber('');
      setOtpCode('');
      setError(null);
      setSuccessMsg(null);
      setLoading(false);
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // ignore
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
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    const formatted = clean.length === 10 ? `+91${clean}` : `+${clean}`;

    try {
      setLoading(true);
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = createRecaptchaVerifier('link-recaptcha-container');
      }
      const confirmation = await sendLinkPhoneOtp(user, formatted, recaptchaVerifierRef.current);
      confirmationRef.current = confirmation;
      setStep('otp');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('credential-already-in-use') || msg.includes('provider-already-linked')) {
        setError('This phone number is already registered to a separate account.');
      } else if (msg.includes('invalid-phone-number')) {
        setError('Invalid phone number format. Please check the digits.');
      } else if (msg.includes('quota-exceeded')) {
        setError('SMS quota exceeded. Please try again later.');
      } else {
        setError(msg || 'Failed to send verification code');
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
      setError('Please enter the full 6-digit OTP code');
      return;
    }

    try {
      setLoading(true);
      await confirmLinkPhoneOtp(confirmationRef.current, otpCode);
      setSuccessMsg('Phone number linked successfully!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('invalid-verification-code')) {
        setError('Invalid OTP code. Please check and try again.');
      } else if (msg.includes('credential-already-in-use')) {
        setError('This phone number is already linked to another account.');
      } else {
        setError(msg || 'Failed to verify OTP');
      }
    } finally {
      setLoading(false);
    }
  };

  const modalElement = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative z-10 w-full max-w-sm bg-white rounded-[20px] shadow-2xl overflow-hidden animate-dialog-pop border border-black/[0.06]">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-iosBlue flex items-center justify-center">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-black tracking-tight">
                {step === 'phone' ? 'Link Phone Number' : 'Verify Mobile OTP'}
              </h3>
              <p className="text-[11px] text-gray-500">
                {step === 'phone'
                  ? 'Connect your phone to this account'
                  : `Code sent to ${phoneNumber}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-iosRed rounded-[12px] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-iosGreen rounded-[12px] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                By linking your phone number, you will be able to log in using <strong>either Google or SMS OTP</strong> and open the exact same shop records.
              </p>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Mobile Number
                </label>
                <div className="flex items-center rounded-[12px] bg-[#F2F2F7] border border-black/[0.04] px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-iosBlue/40">
                  <span className="text-sm font-semibold text-gray-500 mr-2 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full bg-transparent text-[15px] font-medium text-black focus:outline-none"
                  />
                </div>
              </div>

              {/* Invisible reCAPTCHA container */}
              <div id="link-recaptcha-container" />

              <button
                type="submit"
                disabled={loading || phoneNumber.length < 10}
                className="w-full py-2.5 px-4 bg-iosBlue hover:bg-blue-600 active:scale-[0.98] disabled:opacity-50 text-white font-semibold text-sm rounded-[12px] shadow-sm flex items-center justify-center gap-2 transition-all"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{loading ? 'Sending OTP...' : 'Send Verification Code'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Enter 6-digit OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full bg-[#F2F2F7] rounded-[12px] px-3.5 py-3 text-center text-xl font-bold tracking-widest text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full py-2.5 px-4 bg-iosBlue hover:bg-blue-600 active:scale-[0.98] disabled:opacity-50 text-white font-semibold text-sm rounded-[12px] shadow-sm flex items-center justify-center gap-2 transition-all"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{loading ? 'Verifying...' : 'Verify & Link Account'}</span>
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-xs text-iosBlue hover:underline font-medium"
                >
                  Change Phone Number
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalElement, document.body);
  }
  return modalElement;
};
