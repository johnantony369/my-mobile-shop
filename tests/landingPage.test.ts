import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('LandingPage Component', () => {
  it('should contain benefit-focused copy and salon positioning', () => {
    const filePath = path.resolve(__dirname, '../src/screens/LandingPage.tsx');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Benefit checks
    expect(content).toContain('Manage your salon without notebooks and confusion');
    expect(content).toContain('WhatsApp');
    expect(content).toContain('₹199');
    expect(content).toContain('₹1,999');

    // Navigation and trust checks
    expect(content).toContain('LegalModal');
  });
});
