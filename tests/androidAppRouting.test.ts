import { describe, it, expect } from 'vitest';
import { detectIsInstalled } from '../src/utils/usePWAInstall';
import { isAndroidNativeApp } from '../src/utils/platform';

describe('Android App Routing & Installation Detection', () => {
  it('detects app is installed when isAndroidNativeApp is true', () => {
    // If Capacitor or TWA is running, detectIsInstalled should return true
    expect(isAndroidNativeApp({ capacitorNative: true })).toBe(true);
  });

  it('detectIsInstalled recognizes native app wrapper', () => {
    (globalThis as any).window = {
      matchMedia: () => ({ matches: false }),
    };
    (globalThis as any).document = {
      referrer: 'android-app://online.mymobileshop.app',
    };

    expect(detectIsInstalled()).toBe(true);
  });
});
