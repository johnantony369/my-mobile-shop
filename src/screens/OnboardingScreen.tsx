import React, { useState } from 'react';
import { Language } from '../types';
import { t } from '../i18n';
import { SegmentedControl } from '../components/SegmentedControl';
import { initAppSettings } from '../db/db';
import { isFirebaseConfigured, auth } from '../firebase/config';
import { pullCloudChanges } from '../firebase/sync';
import { LoginModal } from '../components/LoginModal';
import { Smartphone, ArrowRight, Store, Sparkles, Tag } from 'lucide-react';
import { getStoredReferralCode, clearStoredReferralCode } from '../utils/useReferralCapture';
import { bindLeadToAccount } from '../firebase/partner';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const language: Language = 'en';
  const [shopName, setShopName] = useState('');
  const [repairsChoice, setRepairsChoice] = useState<'no' | 'yes'>('no');
  const [partnerCode, setPartnerCode] = useState<string>(getStoredReferralCode() || '');
  const [error, setError] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleLoginSuccess = async () => {
    const uid = auth?.currentUser?.uid;
    if (uid) {
      await pullCloudChanges(uid);
    }
    onComplete();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = shopName.trim();
    if (!trimmed) {
      setError(t('onboarding_shop_name_required', language));
      return;
    }

    try {
      const uid = auth?.currentUser?.uid;
      const userPhone = auth?.currentUser?.phoneNumber || '';

      if (uid) {
        try {
          await bindLeadToAccount(uid, trimmed, userPhone, partnerCode.trim());
          clearStoredReferralCode();
        } catch (err) {
          console.warn('Could not bind partner lead during onboarding:', err);
        }
      }

      await initAppSettings(trimmed, language, repairsChoice === 'yes', true, uid);
      onComplete();
    } catch (err) {
      console.error('Error saving initial settings:', err);
    }
  };

  return (
    <div className="min-h-screen bg-iosBg flex flex-col justify-between p-6 max-w-md mx-auto select-none">
      {/* Top Section */}
      <div className="pt-8 flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-white rounded-[22px] shadow-md flex items-center justify-center mb-4 border border-black/[0.04]">
          <div className="w-14 h-14 bg-blue-50 text-iosBlue rounded-[16px] flex items-center justify-center">
            <Smartphone className="w-8 h-8" />
          </div>
        </div>

        <h1 className="text-[28px] font-extrabold text-black tracking-tight">
          {t('app_name', language)}
        </h1>
        <p className="text-[17px] font-medium text-iosBlue mt-1">
          {t('onboarding_welcome', language)}
        </p>
        <p className="text-[14px] text-[#8E8E93] mt-1.5 max-w-[280px] leading-relaxed">
          {t('onboarding_subtitle', language)}
        </p>
      </div>

      {/* Form Section */}
      <form onSubmit={handleSubmit} className="my-auto py-4 space-y-4">

        {/* Shop Name Input */}
        <div className="bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04]">
          <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-2">
            {t('onboarding_shop_name_label', language)}
          </label>
          <input
            type="text"
            value={shopName}
            onChange={(e) => {
              setShopName(e.target.value);
              if (error) setError(null);
            }}
            placeholder={t('onboarding_shop_name_placeholder', language)}
            autoFocus
            className="w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-3 text-[16px] font-medium text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
          />
          {error && <p className="text-xs text-iosRed font-medium mt-1.5">{error}</p>}
        </div>

        {/* Partner Referral Code (Optional) */}
        <div className="bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04] space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="size-3.5 text-iosBlue" />
              <span>Partner Code (Optional)</span>
            </label>
            {partnerCode && (
              <span className="text-[10px] font-bold text-iosGreen flex items-center gap-1">
                <Sparkles className="size-3" />
                <span>7-Day Pro Active</span>
              </span>
            )}
          </div>
          <input
            type="text"
            value={partnerCode}
            onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
            placeholder="Enter distributor code (e.g. METRO99)"
            className="w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-sm font-mono font-bold text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
          />
          <p className="text-[11px] text-[#8E8E93]">
            Have a wholesale counter code? Enter it to get an extended <strong>7-Day Free Pro trial</strong>.
          </p>
        </div>
      </form>

      {/* Bottom Button */}
      <div className="pb-6 space-y-4">
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full h-13 py-3.5 bg-iosBlue text-white font-semibold text-[17px] rounded-[14px] shadow-lg shadow-iosBlue/25 flex items-center justify-center space-x-2 active:opacity-85 transition-opacity"
        >
          <span>{t('onboarding_start_button', language)}</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        {isFirebaseConfigured() && (
          <div className="pt-1 text-center">
            <div className="relative flex items-center justify-center mb-3">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-iosBg px-2.5 text-xs text-[#8E8E93] font-medium uppercase tracking-wider absolute">
                or
              </span>
            </div>

            <p className="text-xs text-[#8E8E93] mb-2 font-medium">
              Already have a shop account?
            </p>

            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-[12px] text-xs font-bold flex items-center justify-center gap-2 active:scale-98 transition-all shadow-sm"
            >
              <Store className="w-4 h-4 text-blue-600" />
              <span>
                Sign In to Restore Your Shop
              </span>
            </button>
          </div>
        )}
      </div>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
        language={language}
      />
    </div>
  );
};
