import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { detectIsInstalled, detectPlatform } from '../src/utils/usePWAInstall';

describe('PWA Install utilities & platform detection', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  describe('detectIsInstalled', () => {
    it('returns false when window is undefined', () => {
      // @ts-expect-error test undefined window
      delete globalThis.window;
      expect(detectIsInstalled()).toBe(false);
    });

    it('returns false when not in standalone mode', () => {
      // @ts-expect-error mock window
      globalThis.window = {
        matchMedia: vi.fn().mockImplementation((query) => ({
          matches: false,
          media: query,
        })),
      };

      expect(detectIsInstalled()).toBe(false);
    });

    it('returns true when matchMedia standalone is true (Android Chrome / Desktop PWA)', () => {
      // @ts-expect-error mock window
      globalThis.window = {
        matchMedia: vi.fn().mockImplementation((query) => ({
          matches: query === '(display-mode: standalone)',
          media: query,
        })),
      };

      expect(detectIsInstalled()).toBe(true);
    });

    it('returns true when navigator.standalone is true (iOS Safari standalone)', () => {
      // @ts-expect-error mock window
      globalThis.window = {
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
      };
      Object.defineProperty(navigator, 'standalone', {
        value: true,
        configurable: true,
      });

      expect(detectIsInstalled()).toBe(true);
    });

    it('returns true when document.referrer indicates Android TWA wrapper', () => {
      // @ts-expect-error mock window
      globalThis.window = {
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
      };
      // @ts-expect-error mock document
      globalThis.document = {
        referrer: 'android-app://org.chromium.webapk',
      };

      expect(detectIsInstalled()).toBe(true);
    });
  });

  describe('detectPlatform (Android Chrome vs iOS Safari)', () => {
    it('correctly identifies Android Chrome user agent', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
      );
      expect(detectPlatform()).toBe('android');
    });

    it('correctly identifies iPhone iOS Safari user agent', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
      );
      expect(detectPlatform()).toBe('ios');
    });

    it('correctly identifies iPad iOS Safari user agent', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
      );
      expect(detectPlatform()).toBe('ios');
    });

    it('correctly identifies modern iPadOS 13+ Safari (MacIntel user agent with multi-touch points)', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
      );
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 5,
        configurable: true,
      });
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });

      expect(detectPlatform()).toBe('ios');
    });

    it('identifies desktop macOS Chrome without touch points as desktop', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        configurable: true,
      });
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });

      expect(detectPlatform()).toBe('desktop');
    });

    it('identifies Windows desktop Chrome as desktop', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      );
      expect(detectPlatform()).toBe('desktop');
    });
  });
});

describe('Android Chrome & iOS Safari Component Contracts', () => {
  it('usePWAInstall implementation manages session dismissal and event listeners', () => {
    const hookPath = path.resolve(__dirname, '../src/utils/usePWAInstall.ts');
    const hookContent = fs.readFileSync(hookPath, 'utf-8');

    expect(hookContent).toContain('beforeinstallprompt');
    expect(hookContent).toContain('appinstalled');
    expect(hookContent).toContain('(display-mode: standalone)');
    expect(hookContent).toContain('pwa_install_banner_dismissed_session');
    expect(hookContent).toContain('triggerInstall');
    expect(hookContent).toContain('deferredPrompt.prompt()');
  });

  it('InstallBanner provides native trigger for Android Chrome and guided instructions for iOS Safari', () => {
    const bannerPath = path.resolve(__dirname, '../src/components/InstallBanner.tsx');
    const bannerContent = fs.readFileSync(bannerPath, 'utf-8');

    // Android Chrome prompt trigger
    expect(bannerContent).toContain('if (canInstall)');
    expect(bannerContent).toContain('await triggerInstall()');

    // iOS Safari instructions
    expect(bannerContent).toContain("platform === 'ios'");
    expect(bannerContent).toContain('In Safari, tap the');
    expect(bannerContent).toContain('Add to Home Screen');
    expect(bannerContent).toContain('InstallGuideModal');

    // Android Chrome manual fallback instructions
    expect(bannerContent).toContain("platform === 'android'");
    expect(bannerContent).toContain('In Chrome / browser, tap the menu');
  });

  it('SettingsScreen integrates AppUpdatesSection with InstallGuideModal for both Android and iOS', () => {
    const settingsPath = path.resolve(__dirname, '../src/screens/SettingsScreen.tsx');
    const settingsContent = fs.readFileSync(settingsPath, 'utf-8');

    expect(settingsContent).toContain('InstallGuideModal');
    expect(settingsContent).toContain('usePWAInstall');
    expect(settingsContent).toContain('Installed');
    expect(settingsContent).toContain('pwa_check_update_btn');
    expect(settingsContent).toContain('navigator.serviceWorker?.getRegistration()');
  });
});

describe('Web App Manifest & iOS Assets Configuration', () => {
  it('index.html contains required Apple touch icon and PWA meta tags', () => {
    const indexPath = path.resolve(__dirname, '../index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf-8');

    expect(indexHtml).toContain('rel="apple-touch-icon"');
    expect(indexHtml).toContain('name="mobile-web-app-capable" content="yes"');
    expect(indexHtml).toContain('name="apple-mobile-web-app-capable" content="yes"');
    expect(indexHtml).toContain('name="apple-mobile-web-app-status-bar-style"');
    expect(indexHtml).toContain('name="apple-mobile-web-app-title"');
    expect(indexHtml).toContain('name="theme-color"');
  });

  it('public directory contains required icons for Android Chrome & iOS Safari', () => {
    const publicDir = path.resolve(__dirname, '../public');
    expect(fs.existsSync(path.join(publicDir, 'icon-192.png'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'icon-512.png'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'apple-touch-icon.png'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'icon.svg'))).toBe(true);
  });

  it('vite.config.ts configures PWA manifest with id, start_url, scope and display standalone', () => {
    const viteConfigPath = path.resolve(__dirname, '../vite.config.ts');
    const viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');

    expect(viteConfig).toContain("id: '/'");
    expect(viteConfig).toContain("start_url: '/'");
    expect(viteConfig).toContain("scope: '/'");
    expect(viteConfig).toContain("display: 'standalone'");
    expect(viteConfig).toContain("purpose: 'maskable'");
    expect(viteConfig).toContain("purpose: 'any'");
  });
});
