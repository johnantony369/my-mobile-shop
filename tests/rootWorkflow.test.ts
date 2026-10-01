import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Root Workflow & Authentication Gate', () => {
  it('should not contain the blocking if (isConfigured && !user) return <LoginScreen /> gate in App.tsx', () => {
    const appPath = path.resolve(__dirname, '../src/App.tsx');
    const content = fs.readFileSync(appPath, 'utf-8');
    expect(content).not.toContain('return (\n      <LoginScreen');
    expect(content).not.toContain('if (isConfigured && !user)');
  });

  it('should include links to Privacy Policy and Terms in LoginScreen and LoginModal', () => {
    const loginScreenPath = path.resolve(__dirname, '../src/screens/LoginScreen.tsx');
    const loginModalPath = path.resolve(__dirname, '../src/components/LoginModal.tsx');
    const screenContent = fs.readFileSync(loginScreenPath, 'utf-8');
    const modalContent = fs.readFileSync(loginModalPath, 'utf-8');

    expect(screenContent).toContain('Privacy Policy');
    expect(screenContent).toContain('Terms of Service');
    expect(modalContent).toContain('Privacy Policy');
    expect(modalContent).toContain('Terms of Service');
  });

  it('should include Legal/Privacy section in SettingsScreen', () => {
    const settingsPath = path.resolve(__dirname, '../src/screens/SettingsScreen.tsx');
    const content = fs.readFileSync(settingsPath, 'utf-8');
    expect(content).toContain('LegalModal');
  });
});
