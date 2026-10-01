import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('LandingPage Component', () => {
  it('should contain benefit-focused copy and no free trial claims', () => {
    const filePath = path.resolve(__dirname, '../src/screens/LandingPage.tsx');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Benefit checks
    expect(content).toContain('Run Your Mobile Shop Without the Daily Notebook Chaos');
    expect(content).toContain('WhatsApp');
    expect(content).toContain('₹99');
    expect(content).toContain('₹999');

    // No free trial check
    expect(content.toLowerCase()).not.toContain('free trial');
    expect(content.toLowerCase()).not.toContain('14-day');

    // Navigation and trust checks
    expect(content).toContain('/login');
    expect(content).toContain('LegalModal');
    expect(content).toContain('support@mymobileshop.online');
  });
});
