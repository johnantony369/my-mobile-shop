import React, { useState } from 'react';
import { Download, X, Share, MoreVertical } from 'lucide-react';
import { usePWAInstall, InstallPlatform } from '../utils/usePWAInstall';
import { Language } from '../types';

interface InstallBannerProps {
  language: Language;
}

/** Step-by-step install guide modal shown when browser does not expose direct prompt */
export const InstallGuideModal: React.FC<{
  platform: InstallPlatform;
  onClose: () => void;
}> = ({ platform, onClose }) => (
  <div
    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center animate-fade-slide-in"
    onClick={onClose}
  >
    <div
      className="bg-white w-full max-w-lg rounded-t-[22px] p-5 pb-8 space-y-4 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/icon-192.png"
            alt="My Mobile Shop"
            className="w-9 h-9 rounded-xl shadow-xs border border-black/5 object-cover"
          />
          <div>
            <h3 className="text-[17px] font-bold text-black leading-tight">
              Install My Mobile Shop
            </h3>
            <p className="text-xs text-[#8E8E93]">Add to your home screen</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] flex items-center justify-center active:scale-95 transition-all text-[#8E8E93] hover:text-black"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {platform === 'ios' && (
        <ol className="space-y-3.5 text-sm text-[#3A3A3C] pt-1">
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-iosBlue text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              1
            </span>
            <span>
              In Safari, tap the{' '}
              <span className="inline-flex items-center gap-1 font-semibold text-iosBlue bg-blue-50 px-2 py-0.5 rounded">
                <Share className="w-3.5 h-3.5" /> Share
              </span>{' '}
              button in the bottom bar
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-iosBlue text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              2
            </span>
            <span>
              Scroll down and tap{' '}
              <strong className="text-black">"Add to Home Screen"</strong>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-iosBlue text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              3
            </span>
            <span>
              Tap <strong className="text-iosBlue">"Add"</strong> in the top right corner
            </span>
          </li>
        </ol>
      )}

      {platform === 'android' && (
        <div className="space-y-3 pt-1">
          <ol className="space-y-3 text-sm text-[#3A3A3C]">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-iosBlue text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                1
              </span>
              <span>
                In Chrome / browser, tap the menu{' '}
                <span className="inline-flex items-center gap-0.5 font-semibold text-black bg-gray-100 px-1.5 py-0.5 rounded">
                  <MoreVertical className="w-3.5 h-3.5" /> (3 dots)
                </span>{' '}
                in the top right
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-iosBlue text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                2
              </span>
              <span>
                Tap <strong className="text-black">"Install app"</strong> or{' '}
                <strong className="text-black">"Add to Home screen"</strong>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-iosBlue text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                3
              </span>
              <span>
                Tap <strong className="text-iosBlue">"Install"</strong> to add it to your apps list
              </span>
            </li>
          </ol>
          <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-2.5 text-xs text-amber-900 leading-relaxed font-medium">
            💡 <strong>Note:</strong> If you opened this link inside WhatsApp or another app, tap the 3 dots and choose <strong>"Open in Chrome"</strong> first.
          </div>
        </div>
      )}

      {platform === 'desktop' && (
        <ol className="space-y-3.5 text-sm text-[#3A3A3C] pt-1">
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-iosBlue text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              1
            </span>
            <span>
              Click the{' '}
              <span className="inline-flex items-center gap-1 font-semibold text-iosBlue bg-blue-50 px-2 py-0.5 rounded">
                <Download className="w-3.5 h-3.5" /> Install
              </span>{' '}
              icon in your browser's address bar (top right)
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-iosBlue text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              2
            </span>
            <span>
              Or click the browser menu (3 dots) and select{' '}
              <strong className="text-black">"Install My Mobile Shop"</strong>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-iosBlue text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              3
            </span>
            <span>
              Click <strong className="text-iosBlue">"Install"</strong> to launch in standalone window
            </span>
          </li>
        </ol>
      )}

      <button
        type="button"
        onClick={onClose}
        className="w-full mt-4 py-3 bg-iosBlue text-white font-bold text-sm rounded-[12px] active:scale-[0.98] transition-transform"
      >
        Got It
      </button>
    </div>
  </div>
);

/**
 * PWA Install Banner shown automatically for non-installed users.
 * - Triggers native browser install prompt if available (canInstall)
 * - Otherwise provides guided platform instructions (iOS, Android, Desktop)
 */
export const InstallBanner: React.FC<InstallBannerProps> = ({ language: _language }) => {
  const { showBanner, canInstall, platform, triggerInstall, dismissBanner } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (!showBanner) return null;

  const handleInstallClick = async () => {
    if (canInstall) {
      await triggerInstall();
    } else {
      const triggered = await triggerInstall();
      if (!triggered) {
        setShowGuide(true);
      }
    }
  };

  return (
    <>
      {/* Floating Install Banner */}
      <div className="fixed bottom-[68px] left-0 right-0 z-40 px-3.5 pointer-events-none pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-lg mx-auto pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-[16px] shadow-xl border border-black/[0.08] p-3 flex items-center gap-3 animate-fade-slide-in">
            {/* App icon */}
            <img
              src="/icon-192.png"
              alt="My Mobile Shop"
              className="w-11 h-11 rounded-[12px] shadow-xs object-cover flex-shrink-0 border border-black/5"
            />

            {/* Banner Text */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-black leading-tight truncate">
                Install My Mobile Shop
              </p>
              <p className="text-[11px] text-[#8E8E93] leading-tight mt-0.5 truncate">
                Add to home screen for quick offline access
              </p>
            </div>

            {/* Install Action Button */}
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 bg-iosBlue hover:bg-blue-600 text-white text-xs font-bold rounded-full flex-shrink-0 active:scale-95 transition-all shadow-sm flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={dismissBanner}
              className="w-7 h-7 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] flex items-center justify-center flex-shrink-0 active:scale-90 transition-all text-[#8E8E93] hover:text-black"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Guide modal for platforms where beforeinstallprompt isn't directly invocable */}
      {showGuide && (
        <InstallGuideModal
          platform={platform}
          onClose={() => setShowGuide(false)}
        />
      )}
    </>
  );
};
