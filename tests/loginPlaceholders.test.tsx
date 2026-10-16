import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Login Page & Modal Default Placeholders', () => {
  it('LoginScreen uses clean, standard default placeholders without dummy examples', () => {
    const screenPath = path.resolve(__dirname, '../src/screens/LoginScreen.tsx');
    const content = fs.readFileSync(screenPath, 'utf-8');

    // Should contain standard neutral placeholders
    expect(content).toContain('placeholder="Enter email or Shop ID"');
    expect(content).toContain('placeholder="Enter password"');
    expect(content).toContain('placeholder="Enter 10-digit mobile number"');
    expect(content).toContain('placeholder="Enter 6-digit OTP"');

    // Should NOT contain hardcoded localized dummy data
    expect(content).not.toContain('keralamobile');
  });

  it('LoginModal uses clean, standard default placeholders without dummy examples', () => {
    const modalPath = path.resolve(__dirname, '../src/components/LoginModal.tsx');
    const content = fs.readFileSync(modalPath, 'utf-8');

    // Should contain standard neutral placeholders
    expect(content).toContain('placeholder="Enter email or Shop ID"');
    expect(content).toContain('placeholder="Enter password"');
    expect(content).toContain('placeholder="Enter 10-digit mobile number"');
    expect(content).toContain('placeholder="Enter 6-digit OTP"');

    // Should NOT contain hardcoded localized dummy data
    expect(content).not.toContain('keralamobile');
  });
});
