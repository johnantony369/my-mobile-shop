import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('LegalModal Component', () => {
  it('should define Privacy Policy and Terms of Service with data protection and contact disclosures', () => {
    const modalPath = path.resolve(__dirname, '../src/components/LegalModal.tsx');
    expect(fs.existsSync(modalPath)).toBe(true);
    const content = fs.readFileSync(modalPath, 'utf-8');
    expect(content).toContain('Privacy Policy');
    expect(content).toContain('Terms of Service');
    expect(content).toContain('IndexedDB');
    expect(content).toContain('Firebase');
    expect(content).toContain('support@mymobileshop.online');
  });
});
