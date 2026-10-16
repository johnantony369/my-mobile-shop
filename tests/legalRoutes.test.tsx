import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import * as fs from 'fs';
import * as path from 'path';
import { PrivacyScreen } from '../src/screens/legal/PrivacyScreen';
import { TermsScreen } from '../src/screens/legal/TermsScreen';

describe('Public Legal Screens & Google Auth Review Compliance', () => {
  it('renders PrivacyScreen with required sections, Google User Data disclosures, and support contact', () => {
    const html = renderToString(
      <MemoryRouter>
        <PrivacyScreen />
      </MemoryRouter>
    );

    expect(html).toContain('Privacy Policy');
    expect(html).toContain('support@mymobileshop.online');
    expect(html).toContain('IndexedDB');
    expect(html).toContain('Firebase');
    expect(html).toContain('Google API Services User Data Policy');
    expect(html).toContain('Limited Use');
    expect(html).toContain('href="/terms"');
  });

  it('renders TermsScreen with required terms, Google auth disclosure, and separate privacy link', () => {
    const html = renderToString(
      <MemoryRouter>
        <TermsScreen />
      </MemoryRouter>
    );

    expect(html).toContain('Terms of Service');
    expect(html).toContain('My Mobile Shop');
    expect(html).toContain('Google Sign-In');
    expect(html).toContain('support@mymobileshop.online');
    expect(html).toContain('href="/privacy"');
  });

  it('AppRouter configures separate /privacy and /terms routes', () => {
    const routerPath = path.resolve(__dirname, '../src/AppRouter.tsx');
    const content = fs.readFileSync(routerPath, 'utf-8');

    expect(content).toContain('path="/privacy"');
    expect(content).toContain('element={<PrivacyScreen />}');
    expect(content).toContain('path="/terms"');
    expect(content).toContain('element={<TermsScreen />}');
  });

  it('LandingPage includes separate links for /privacy and /terms', () => {
    const landingPath = path.resolve(__dirname, '../src/screens/LandingPage.tsx');
    const content = fs.readFileSync(landingPath, 'utf-8');

    expect(content).toContain('to="/privacy"');
    expect(content).toContain('Privacy Policy');
    expect(content).toContain('to="/terms"');
    expect(content).toContain('Terms of Service');
  });

  it('LoginScreen includes separate direct links for /privacy and /terms', () => {
    const loginPath = path.resolve(__dirname, '../src/screens/LoginScreen.tsx');
    const content = fs.readFileSync(loginPath, 'utf-8');

    expect(content).toContain('to="/privacy"');
    expect(content).toContain('to="/terms"');
    expect(content).toContain('Privacy Policy');
    expect(content).toContain('Terms of Service');
  });

  it('LoginModal includes separate direct links for /privacy and /terms', () => {
    const modalPath = path.resolve(__dirname, '../src/components/LoginModal.tsx');
    const content = fs.readFileSync(modalPath, 'utf-8');

    expect(content).toContain('href="/privacy"');
    expect(content).toContain('href="/terms"');
    expect(content).toContain('Privacy Policy');
    expect(content).toContain('Terms of Service');
  });

  it('SettingsScreen provides separate links to /privacy and /terms', () => {
    const settingsPath = path.resolve(__dirname, '../src/screens/SettingsScreen.tsx');
    const content = fs.readFileSync(settingsPath, 'utf-8');

    expect(content).toContain('href="/privacy"');
    expect(content).toContain('href="/terms"');
  });
});

