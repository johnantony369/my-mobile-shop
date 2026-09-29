import React, { useState } from 'react';
import { Language } from '../types';
import { t } from '../i18n';
import { SegmentedControl } from '../components/SegmentedControl';
import { initAppSettings } from '../db/db';
import { Smartphone, ArrowRight } from 'lucide-react';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [language, setLanguage] = useState<Language>('ml');
  const [shopName, setShopName] = useState('');
  const [repairsChoice, setRepairsChoice] = useState<'no' | 'yes'>('no');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = shopName.trim();
    if (!trimmed) {
      setError(t('onboarding_shop_name_required', language));
      return;
    }

    try {
      await initAppSettings(trimmed, language, repairsChoice === 'yes');
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
        {/* Language Selection */}
        <div className="bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04]">
          <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-2">
            {t('onboarding_language_label', language)}
          </label>
          <SegmentedControl<Language>
            value={language}
            onChange={(val) => setLanguage(val)}
            size="md"
            options={[
              { value: 'ml', label: 'മലയാളം' },
              { value: 'en', label: 'English' },
            ]}
          />
        </div>

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

        {/* Repairs Question: നിങ്ങൾ ഫോൺ റിപ്പയർ ചെയ്യുന്നുണ്ടോ? (ഉണ്ട് / ഇല്ല) */}
        <div className="bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04]">
          <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-2">
            {t('onboarding_repairs_question', language)}
          </label>
          <SegmentedControl<'no' | 'yes'>
            value={repairsChoice}
            onChange={(val) => setRepairsChoice(val)}
            size="md"
            options={[
              { value: 'no', label: t('onboarding_repairs_no', language) },
              { value: 'yes', label: t('onboarding_repairs_yes', language) },
            ]}
          />
        </div>
      </form>

      {/* Bottom Button */}
      <div className="pb-6">
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full h-13 py-3.5 bg-iosBlue text-white font-semibold text-[17px] rounded-[14px] shadow-lg shadow-iosBlue/25 flex items-center justify-center space-x-2 active:opacity-85 transition-opacity"
        >
          <span>{t('onboarding_start_button', language)}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
