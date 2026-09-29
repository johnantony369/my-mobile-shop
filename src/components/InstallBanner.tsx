import React, { useState } from 'react';
import { Download, X, Share } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { Language } from '../types';

interface InstallBannerProps {
  language: Language;
}

/** iOS-specific step-by-step install guide shown as an overlay */
const IOSInstructions: React.FC<{ language: Language; onClose: () => void }> = ({
  language,
  onClose,
}) => (
  <div
    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center"
    onClick={onClose}
  >
    <div
      className="bg-white w-full max-w-lg rounded-t-[20px] p-5 pb-10 space-y-4 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[17px] font-bold text-black">
          {language === 'ml' ? 'ഫോണിൽ ഇൻസ്റ്റാൾ ചെയ്യുക' : 'Install to Home Screen'}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center active:opacity-70"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-[#8E8E93]" />
        </button>
      </div>

      <ol className="space-y-3 text-sm text-[#3A3A3C]">
        <li className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-iosBlue text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
            1
          </span>
          <span>
            {language === 'ml' ? (
              <>
                Safari-ൽ താഴെ കാണുന്ന{' '}
                <span className="inline-flex items-center gap-0.5 font-semibold text-iosBlue">
                  <Share className="w-3.5 h-3.5" /> Share
                </span>{' '}
                ബട്ടൺ അമർത്തുക
              </>
            ) : (
              <>
                In Safari, tap the{' '}
                <span className="inline-flex items-center gap-0.5 font-semibold text-iosBlue">
                  <Share className="w-3.5 h-3.5" /> Share
                </span>{' '}
                button at the bottom of the screen
              </>
            )}
          </span>
        </li>
        <li className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-iosBlue text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
            2
          </span>
          <span>
            {language === 'ml'
              ? 'ലിസ്റ്റ് താഴേക്ക് സ്ക്രോൾ ചെയ്ത് "Add to Home Screen" / "ഹോം സ്ക്രീനിൽ ചേർക്കുക" തിരഞ്ഞെടുക്കുക'
              : 'Scroll down and tap "Add to Home Screen"'}
          </span>
        </li>
        <li className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-iosBlue text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
            3
          </span>
          <span>
            {language === 'ml'
              ? 'മുകളിൽ വലത്ത് "Add" / "ചേർക്കുക" ബട്ടൺ ടാപ്പ് ചെയ്യുക'
              : 'Tap "Add" in the top right corner'}
          </span>
        </li>
      </ol>
    </div>
  </div>
);

/**
 * Smart install banner shown to first-time browser visitors.
 * - Android/Desktop: uses native beforeinstallprompt
 * - iOS: shows step-by-step guide sheet
 * - Hidden once dismissed (stored in localStorage) or when already installed
 */
export const InstallBanner: React.FC<InstallBannerProps> = ({ language }) => {
  const { showBanner, canInstall, platform, triggerInstall, dismissBanner } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (!showBanner) return null;

  const handleInstallClick = async () => {
    if (platform === 'ios') {
      setShowIOSGuide(true);
    } else {
      await triggerInstall();
    }
  };

  return (
    <>
      {/* Banner */}
      <div className="fixed bottom-[72px] left-0 right-0 z-40 px-4 pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto">
          <div className="bg-white rounded-[16px] shadow-lg border border-black/[0.06] p-3.5 flex items-center gap-3 animate-fade-slide-in">
            {/* App icon */}
            <div className="w-11 h-11 rounded-[12px] bg-iosBlue flex items-center justify-center flex-shrink-0 shadow-sm">
              <Download className="w-5 h-5 text-white" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-black leading-tight">
                {language === 'ml' ? 'ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യുക' : 'Install My Mobile Shop'}
              </p>
              <p className="text-[11px] text-[#8E8E93] leading-tight mt-0.5">
                {language === 'ml'
                  ? 'ഫോൺ ഹോം സ്ക്രീനിൽ ആപ്പ് ആക്കാൻ'
                  : 'Add to home screen for quick access'}
              </p>
            </div>

            {/* Install button */}
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 bg-iosBlue text-white text-xs font-bold rounded-full flex-shrink-0 active:opacity-80 transition-opacity"
            >
              {language === 'ml' ? 'ഇൻസ്റ്റാൾ' : (canInstall ? 'Install' : 'How to')}
            </button>

            {/* Dismiss */}
            <button
              type="button"
              onClick={dismissBanner}
              className="w-6 h-6 rounded-full bg-[#F2F2F7] flex items-center justify-center flex-shrink-0 active:opacity-70"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5 text-[#8E8E93]" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS guide overlay */}
      {showIOSGuide && (
        <IOSInstructions language={language} onClose={() => setShowIOSGuide(false)} />
      )}
    </>
  );
};
