import React, { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  loginWithPassword,
  registerWithPassword,
  loginWithGoogle,
  createRecaptchaVerifier,
  sendOtp,
  confirmOtp
} from '../firebase/auth';
import { pullCloudChanges } from '../firebase/sync';
import { clearLocalDatabase, getAppSettings } from '../db/db';
import { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import {
  Store,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { LegalModal } from '../components/LegalModal';

interface LoginScreenProps {
  onSuccess: () => void;
  language?: string;
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [searchParams] = useSearchParams();
  // View: 'password' | 'phone_number' | 'phone_otp'
  const [view, setView] = useState<'password' | 'phone_number' | 'phone_otp'>('password');
  const [mode, setMode] = useState<'login' | 'register'>(
    searchParams.get('mode') === 'register' ? 'register' : 'login'
  );

  // Legal Modal State
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms'>('privacy');

  // Password State
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanId = loginId.trim();
    if (!cleanId) {
      setError('Please enter your Login ID or Email');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      let userObj;
      if (mode === 'register') {
        userObj = await registerWithPassword(cleanId, password);
      } else {
        userObj = await loginWithPassword(cleanId, password);
      }
      const previousUid = localStorage.getItem('mms_user_id');
      const localSettings = await getAppSettings();
      if ((previousUid && previousUid !== userObj.uid) || (localSettings?.ownerUid && localSettings.ownerUid !== userObj.uid)) {
        await clearLocalDatabase();
      }
      localStorage.setItem('mms_authenticated', 'true');
      localStorage.setItem('mms_user_id', userObj.uid);
      setSuccessMsg(mode === 'register' ? 'Account created successfully!' : 'Logged in successfully!');
      try {
        await pullCloudChanges(userObj.uid);
      } catch (syncErr) {
        console.warn('Initial cloud pull failed or partial:', syncErr);
      }
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('Invalid Login ID or Password');
      } else if (msg.includes('email-already-in-use')) {
        setError('This Login ID already exists. Please Sign In.');
      } else if (msg.includes('weak-password')) {
        setError('Password should be stronger (at least 6 characters)');
      } else {
        setError(msg || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMsg(null);
    try {
      setLoading(true);
      const u = await loginWithGoogle();
      const previousUid = localStorage.getItem('mms_user_id');
      const localSettings = await getAppSettings();
      if ((previousUid && previousUid !== u.uid) || (localSettings?.ownerUid && localSettings.ownerUid !== u.uid)) {
        await clearLocalDatabase();
      }
      localStorage.setItem('mms_authenticated', 'true');
      localStorage.setItem('mms_user_id', u.uid);
      setSuccessMsg('Logged in successfully!');
      try {
        await pullCloudChanges(u.uid);
      } catch (syncErr) {
        console.warn('Initial cloud pull failed or partial:', syncErr);
      }
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('popup-closed-by-user')) {
        setError(msg || 'Google sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneOtp = async (e: React.FormEvent) => {
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
        recaptchaVerifierRef.current = createRecaptchaVerifier('login-recaptcha-screen');
      }
      const confirmation = await sendOtp(formatted, recaptchaVerifierRef.current);
      confirmationRef.current = confirmation;
      setView('phone_otp');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('invalid-phone-number')) {
        setError('Invalid phone number format');
      } else if (msg.includes('quota-exceeded')) {
        setError('SMS quota exceeded. Please use Login ID or Google.');
      } else {
        setError(msg || 'Failed to send OTP');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationRef.current) return;
    setError(null);

    if (otpCode.length !== 6) {
      setError('Enter 6-digit OTP code');
      return;
    }

    try {
      setLoading(true);
      const u = await confirmOtp(confirmationRef.current, otpCode);
      const previousUid = localStorage.getItem('mms_user_id');
      const localSettings = await getAppSettings();
      if ((previousUid && previousUid !== u.uid) || (localSettings?.ownerUid && localSettings.ownerUid !== u.uid)) {
        await clearLocalDatabase();
      }
      localStorage.setItem('mms_authenticated', 'true');
      localStorage.setItem('mms_user_id', u.uid);
      setSuccessMsg('Logged in successfully!');
      try {
        await pullCloudChanges(u.uid);
      } catch (syncErr) {
        console.warn('Initial cloud pull failed or partial:', syncErr);
      }
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('invalid-verification-code')) {
        setError('Invalid verification code');
      } else {
        setError(msg || 'Verification failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white sm:bg-iosBg flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-iosBlue/20">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 sm:p-8 shadow-none sm:shadow-xl border-0 sm:border sm:border-slate-200">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="flex justify-center mx-auto mb-3.5">
            <img
              src="/icon-192.png"
              alt="My Mobile Shop Logo"
              className="w-16 h-16 rounded-2xl shadow-sm border border-slate-100 object-cover"
            />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            My Mobile Shop
          </h1>
          <h2 className="text-sm font-bold text-slate-700 mt-1">
            {view === 'password'
              ? mode === 'login'
                ? 'Shop Sign In'
                : 'Create Shop Account'
              : view === 'phone_number'
              ? 'Sign in with Phone'
              : 'Enter Verification Code'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {view === 'password'
              ? 'Access your cloud ledger and customer repairs'
              : view === 'phone_number'
              ? 'Enter your 10-digit mobile number'
              : `Enter the code sent to ${phoneNumber}`}
          </p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-xl text-xs flex items-center gap-2 border border-green-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* VIEW 1: Password Form */}
        {view === 'password' && (
          <div>
            <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Login ID / Shop ID
                </label>
                <div className="flex items-center gap-2.5 border border-slate-300 rounded-xl px-3.5 py-2.5 bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                  <Store className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="e.g. keralamobile or email"
                    value={loginId}
                    onChange={e => setLoginId(e.target.value)}
                    className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="flex items-center gap-2.5 border border-slate-300 rounded-xl px-3.5 py-2.5 bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !loginId.trim() || !password}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-98"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-3.5 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError(null);
                }}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                {mode === 'login'
                  ? "Don't have a shop account? Register here"
                  : 'Already have an account? Sign in'}
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-2.5 text-[11px] text-slate-400 font-medium uppercase tracking-wider absolute">
                or continue with
              </span>
            </div>

            {/* Social Buttons: Google & Phone */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="py-2.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 active:scale-98 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.41l4.03-3.13z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.59l4.03 3.13c.95-2.83 3.6-4.97 6.72-4.97z"
                  />
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setView('phone_number');
                }}
                disabled={loading}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-98 transition-all"
              >
                <Phone className="w-3.5 h-3.5 text-blue-500" />
                <span>Phone OTP</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: Phone Input */}
        {view === 'phone_number' && (
          <form onSubmit={handleSendPhoneOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mobile Number
              </label>
              <div className="flex items-center gap-2 border border-slate-300 rounded-xl px-3.5 py-2.5 bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                <span className="text-sm font-semibold text-slate-500">+91</span>
                <input
                  type="tel"
                  placeholder="9876543210"
                  maxLength={10}
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div id="login-recaptcha-screen" />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setView('password');
                }}
                disabled={loading}
                className="w-1/3 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium text-xs hover:bg-slate-100"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || phoneNumber.length < 10}
                className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/25"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Send OTP
              </button>
            </div>
          </form>
        )}

        {/* VIEW 3: OTP Code */}
        {view === 'phone_otp' && (
          <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                6-digit OTP Code
              </label>
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full tracking-widest text-center text-lg font-bold border border-slate-300 rounded-xl px-3 py-2.5 bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setView('phone_number');
                }}
                disabled={loading}
                className="w-1/3 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium text-xs hover:bg-slate-100"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/25"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Verify & Sign In
              </button>
            </div>
          </form>
        )}

        {/* Legal & Trust Footer */}
        <div className="mt-5 pt-3.5 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            By continuing, you agree to our{' '}
            <button
              type="button"
              onClick={() => {
                setLegalTab('terms');
                setIsLegalOpen(true);
              }}
              className="text-iosBlue hover:underline font-medium"
            >
              Terms of Service
            </button>
            {' & '}
            <button
              type="button"
              onClick={() => {
                setLegalTab('privacy');
                setIsLegalOpen(true);
              }}
              className="text-iosBlue hover:underline font-medium"
            >
              Privacy Policy
            </button>
          </p>
        </div>
      </div>

      {/* Legal & Trust Modal */}
      <LegalModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        initialTab={legalTab}
      />
    </div>
  );
}
