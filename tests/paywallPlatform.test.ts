import { describe, it, expect } from 'vitest';
import { isAndroidNativeApp } from '../src/utils/platform';

describe('Platform Detection', () => {
  it('detects Android app wrapper when Capacitor is present', () => {
    expect(isAndroidNativeApp({ capacitorNative: true })).toBe(true);
  });

  it('detects Android app wrapper when android-app referrer is present', () => {
    expect(isAndroidNativeApp({ referrer: 'android-app://online.mymobileshop.app' })).toBe(true);
  });

  it('detects Android app wrapper when android userAgent in standalone mode', () => {
    expect(isAndroidNativeApp({ userAgent: 'Mozilla/5.0 (Linux; Android 14)', standalone: true })).toBe(true);
  });

  it('returns false for ordinary desktop browser', () => {
    expect(
      isAndroidNativeApp({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        referrer: '',
        standalone: false,
        capacitorNative: false,
      })
    ).toBe(false);
  });

  it('returns false for iOS browser', () => {
    expect(
      isAndroidNativeApp({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        referrer: '',
        standalone: false,
        capacitorNative: false,
      })
    ).toBe(false);
  });
});
