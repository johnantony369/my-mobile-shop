import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { SettingsScreen } from '../src/screens/SettingsScreen';
import { AppSettings } from '../src/types';

describe('SettingsScreen Partner Program Banner', () => {
  const freeSettings: AppSettings = {
    id: 1,
    shopName: 'Test Mobile Shop',
    language: 'en',
    firstLaunchDate: '2026-10-01',
    activated: false,
    proPlan: null,
    proExpiresAt: null,
    lastBackupAt: null,
    showRepairs: true,
    showStock: true,
    wholesaleMode: false,
    cloudId: 'settings-1',
    updatedAt: new Date().toISOString(),
  };

  it('renders the Partner Program card banner and top-right Upgrade button for non-pro user', () => {
    const html = renderToString(
      <MemoryRouter>
        <SettingsScreen
          settings={freeSettings}
          language="en"
          onLanguageChange={() => {}}
          onRefreshSettings={() => {}}
        />
      </MemoryRouter>
    );

    // Option B Soft Accent Card Elements
    expect(html).toContain('Partner Program');
    expect(html).toContain('₹300 / Shop');
    expect(html).toContain('Distributor network');
    expect(html).toContain('Open');

    // Top Right Upgrade Button & Banner Removal
    expect(html).toContain('Upgrade');
    expect(html).not.toContain('Unlimited day book transactions, automatic cloud sync');
  });

  it('renders Pro status at top right and no large banner for pro user', () => {
    const html = renderToString(
      <MemoryRouter>
        <SettingsScreen
          settings={{ ...freeSettings, activated: true, proPlan: 'yearly' }}
          language="en"
          onLanguageChange={() => {}}
          onRefreshSettings={() => {}}
        />
      </MemoryRouter>
    );

    expect(html).toContain('Pro');
    expect(html).not.toContain('Unlimited day book transactions, automatic cloud sync');
  });
});
