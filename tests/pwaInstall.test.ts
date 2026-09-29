import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { detectIsInstalled, detectPlatform } from '../src/utils/usePWAInstall';

describe('PWA Install utilities', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it('detectIsInstalled returns false when window is undefined', () => {
    // @ts-expect-error test undefined window
    delete globalThis.window;
    expect(detectIsInstalled()).toBe(false);
  });

  it('detectIsInstalled returns false when not in standalone mode', () => {
    // @ts-expect-error mock window
    globalThis.window = {
      matchMedia: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
      })),
    };

    expect(detectIsInstalled()).toBe(false);
  });

  it('detectIsInstalled returns true when matchMedia standalone is true', () => {
    // @ts-expect-error mock window
    globalThis.window = {
      matchMedia: vi.fn().mockImplementation((query) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
      })),
    };

    expect(detectIsInstalled()).toBe(true);
  });

  it('detectPlatform correctly identifies iOS from user agent', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
    );
    expect(detectPlatform()).toBe('ios');
  });

  it('detectPlatform correctly identifies Android from user agent', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36'
    );
    expect(detectPlatform()).toBe('android');
  });

  it('detectPlatform falls back to desktop for desktop browsers', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );
    expect(detectPlatform()).toBe('desktop');
  });
});
