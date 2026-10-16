import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('LandingPage Component', () => {
  it('should contain benefit-focused copy and no free trial claims', () => {
    const filePath = path.resolve(__dirname, '../src/screens/LandingPage.tsx');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Benefit checks
    expect(content).toContain('A calmer way to run your mobile shop.');
    expect(content).toContain('₹249');
    expect(content).toContain('₹2,499');
    expect(content.toLowerCase()).toContain('2 months free');

    // No free trial check
    expect(content.toLowerCase()).not.toContain('free trial');
    expect(content.toLowerCase()).not.toContain('14-day');

    // Navigation and trust checks
    expect(content).toContain('/login');
    expect(content).toContain('LegalModal');
    expect(content).toContain('support@mymobileshop.online');
  });

  it('hooks automatic country detection into LandingPage with fallback and manual persistence', () => {
    const filePath = path.resolve(__dirname, '../src/screens/LandingPage.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Consumes resolution utilities
    expect(content).toContain('resolveVisitorCountry');
    expect(content).toContain('detectVisitorCountry');
    expect(content).toContain('saveVisitorCountry');

    // Instant zero-shift initial state
    expect(content).toContain('useState<CountryCode>(() => detectVisitorCountry())');

    // Asynchronous resolution guarded by localStorage check
    expect(content).toMatch(/localStorage\.getItem\((?:'mms_pricing_country'|STORAGE_KEY_COUNTRY)\)/);
    expect(content).toContain('resolveVisitorCountry()');

    // User selection persists choice
    expect(content).toMatch(/saveVisitorCountry\(/);
  });

  it('hooks automatic country detection into PaywallModal with fallback and manual persistence', () => {
    const filePath = path.resolve(__dirname, '../src/components/PaywallModal.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Consumes resolution utilities
    expect(content).toContain('resolveVisitorCountry');
    expect(content).toContain('detectVisitorCountry');
    expect(content).toContain('saveVisitorCountry');

    // Instant zero-shift initial state
    expect(content).toContain('useState<CountryCode>(() => detectVisitorCountry())');

    // Asynchronous resolution guarded by isOpen and localStorage check
    expect(content).toMatch(/localStorage\.getItem\((?:'mms_pricing_country'|STORAGE_KEY_COUNTRY)\)/);
    expect(content).toContain('resolveVisitorCountry()');

    // User selection persists choice
    expect(content).toMatch(/saveVisitorCountry\(code\)/);
  });

  it('enforces STRICT ZERO EMOJIS in LandingPage and PaywallModal', () => {
    const landingPath = path.resolve(__dirname, '../src/screens/LandingPage.tsx');
    const paywallPath = path.resolve(__dirname, '../src/components/PaywallModal.tsx');

    const landingContent = fs.readFileSync(landingPath, 'utf-8');
    const paywallContent = fs.readFileSync(paywallPath, 'utf-8');

    // Unicode regex for emojis including flags, symbols, emoticons, pictographs
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}]/u;

    expect(emojiRegex.test(landingContent)).toBe(false);
    expect(emojiRegex.test(paywallContent)).toBe(false);
  });
});

