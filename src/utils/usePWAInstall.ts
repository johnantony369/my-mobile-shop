import { useState, useEffect } from 'react';

const DISMISSED_KEY = 'pwa_install_banner_dismissed';

export type InstallPlatform = 'android' | 'ios' | 'desktop' | null;

interface UsePWAInstallReturn {
  /** Whether the app is already running in standalone (installed) mode */
  isInstalled: boolean;
  /** Whether a browser install prompt is available to invoke */
  canInstall: boolean;
  /** The detected platform type for platform-specific guidance */
  platform: InstallPlatform;
  /** Whether the install banner should be shown */
  showBanner: boolean;
  /** Trigger the native browser install prompt (Android/Desktop) */
  triggerInstall: () => Promise<void>;
  /** Dismiss the install banner persistently */
  dismissBanner: () => void;
}

/** BeforeInstallPromptEvent is not in standard TypeScript lib yet */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function detectPlatform(): InstallPlatform {
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua) && !(window as unknown as Record<string, unknown>).MSStream;
  if (isIOS) return 'ios';
  const isAndroid = /android/i.test(ua);
  if (isAndroid) return 'android';
  return 'desktop';
}

function detectIsInstalled(): boolean {
  // Chromium-based standalone
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari "Add to Home Screen"
  if ((navigator as unknown as { standalone?: boolean }).standalone === true) return true;
  return false;
}

export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(detectIsInstalled);
  const [dismissed, setDismissed] = useState<boolean>(
    () => localStorage.getItem(DISMISSED_KEY) === '1'
  );

  const platform = detectPlatform();
  const canInstall = !!deferredPrompt;

  // Capture the beforeinstallprompt event
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Listen for the app being installed (clears the prompt)
    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const dismissBanner = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  // Show banner when: not installed, not dismissed, and (browser has prompt OR it's iOS)
  const showBanner =
    !isInstalled &&
    !dismissed &&
    (canInstall || platform === 'ios');

  return { isInstalled, canInstall, platform, showBanner, triggerInstall, dismissBanner };
}
