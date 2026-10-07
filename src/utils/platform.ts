export interface PlatformOverrideOptions {
  capacitorNative?: boolean;
  referrer?: string;
  userAgent?: string;
  standalone?: boolean;
}

/**
 * Checks whether the current runtime environment is inside an Android app wrapper
 * (such as Capacitor native Android or Trusted Web Activity / Android PWA).
 */
export function isAndroidNativeApp(override?: PlatformOverrideOptions): boolean {
  if (override !== undefined) {
    if (override.capacitorNative) return true;
    if (override.referrer && override.referrer.startsWith('android-app://')) return true;
    const isAndroid = Boolean(override.userAgent && /android/i.test(override.userAgent));
    if (isAndroid && override.standalone) return true;
    return false;
  }

  if (typeof window === 'undefined') return false;

  // 1. Capacitor native check
  const cap = (window as any).Capacitor;
  if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) {
    const platform = typeof cap.getPlatform === 'function' ? cap.getPlatform() : '';
    if (platform === 'android' || !platform) return true;
  }

  // 2. Android App Referrer (TWA / Chrome Custom Tabs app)
  if (typeof document !== 'undefined' && document.referrer && document.referrer.startsWith('android-app://')) {
    return true;
  }

  // 3. Android Standalone PWA mode
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isAndroid = /android/i.test(ua);
  const isStandalone =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    (navigator as any).standalone === true;

  return isAndroid && isStandalone;
}
