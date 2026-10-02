import { useState, useEffect } from 'react';

const DISMISSED_SESSION_KEY = 'pwa_install_banner_dismissed_session';

export type InstallPlatform = 'android' | 'ios' | 'desktop';

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
  /** Dismiss the install banner for the current session */
  dismissBanner: () => void;
}

/** BeforeInstallPromptEvent is not in standard TypeScript lib yet */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function detectPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  const hasMSStream = typeof window !== 'undefined' && Boolean((window as unknown as Record<string, unknown>).MSStream);
  const isIPadOS = typeof navigator !== 'undefined' && (/macintosh/i.test(ua) || (navigator as { platform?: string }).platform === 'MacIntel') && (navigator.maxTouchPoints ?? 0) > 1;
  const isIOS = (/iphone|ipad|ipod/i.test(ua) || isIPadOS) && !hasMSStream;
  if (isIOS) return 'ios';
  const isAndroid = /android/i.test(ua);
  if (isAndroid) return 'android';
  return 'desktop';
}

export function detectIsInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  // Chromium / Android standalone
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari "Add to Home Screen"
  if ((navigator as unknown as { standalone?: boolean }).standalone === true) return true;
  // Android TWA / app referrer
  if (typeof document !== 'undefined' && document.referrer && document.referrer.startsWith('android-app://')) return true;
  return false;
}

export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(detectIsInstalled);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(DISMISSED_SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });

  const platform = detectPlatform();
  const canInstall = !!deferredPrompt;

  // Clean up any stale permanent suppression from previous versions
  useEffect(() => {
    try {
      localStorage.removeItem('pwa_install_banner_dismissed');
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Capture the beforeinstallprompt event & monitor installation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Listen for the app being installed (clears the prompt and marks as installed)
    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', installedHandler);

    // Listen for display mode changes (e.g. user launched in standalone)
    let mediaQuery: MediaQueryList | null = null;
    const mediaChangeHandler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
      }
    };
    if (window.matchMedia) {
      mediaQuery = window.matchMedia('(display-mode: standalone)');
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', mediaChangeHandler);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
      if (mediaQuery && mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', mediaChangeHandler);
      }
    };
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
    } catch (err) {
      console.error('Error triggering PWA install:', err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  const dismissBanner = () => {
    try {
      sessionStorage.setItem(DISMISSED_SESSION_KEY, '1');
    } catch {
      // Ignore storage errors
    }
    setDismissed(true);
  };

  // Show banner for all users who have not installed the app and haven't dismissed this session
  const showBanner = !isInstalled && !dismissed;

  return { isInstalled, canInstall, platform, showBanner, triggerInstall, dismissBanner };
}
