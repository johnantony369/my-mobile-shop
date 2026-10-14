import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { SettingsScreen } from '../src/screens/SettingsScreen';
import { AppSettings } from '../src/types';

describe('SettingsScreen Partner Program Banner', () => {
  const baseSettings: AppSettings = {
    id: 1,
    shopName: 'Test Mobile Shop',
    language: 'en',
    firstLaunchDate: '2026-10-01',
    activated: true,
    lastBackupAt: null,
    showRepairs: true,
    showStock: true,
    wholesaleMode: false,
    cloudId: 'settings-1',
    updatedAt: new Date().toISOString(),
  };

  it('renders the Partner Program card banner at the top of SettingsScreen', () => {
    const html = renderToString(
      <MemoryRouter>
        <SettingsScreen
          settings={baseSettings}
          language="en"
          onLanguageChange={() => {}}
          onRefreshSettings={() => {}}
        />
      </MemoryRouter>
    );

    // Option 1 Premium Midnight Obsidian Banner Elements
    expect(html).toContain('Partner Network');
    expect(html).toContain('₹300 / Referral');
    expect(html).toContain('Earn with Every Mobile Shop');
    expect(html).toContain('Free Acrylic Standee');
    expect(html).toContain('Open Partner Portal');
  });
});
