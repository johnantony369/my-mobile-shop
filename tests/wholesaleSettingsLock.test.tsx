import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { SettingsScreen } from '../src/screens/SettingsScreen';
import { OnboardingScreen } from '../src/screens/OnboardingScreen';
import { WholesaleActivationModal } from '../src/components/wholesale/WholesaleActivationModal';
import { setAccountWholesalerStatus } from '../src/firebase/admin';
import { AppSettings } from '../src/types';

describe('Wholesale Mode Settings Lock & Activation Modal', () => {
  const baseSettings: AppSettings = {
    id: 1,
    shopName: 'Test Repair Shop',
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

  it('renders locked wholesale state for normal user without wholesaler approval', () => {
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

    expect(html).toContain('Wholesale &amp; Spares Mode');
    expect(html).toContain('Request Access');
    expect(html.toLowerCase()).not.toContain('udhar');
    expect(html.toLowerCase()).not.toContain('khata');
  });

  it('renders WholesaleActivationModal with WhatsApp support action and neutral copy', () => {
    const html = renderToString(
      <WholesaleActivationModal
        isOpen={true}
        onClose={() => {}}
        shopName="Star Tech Repairs"
        shopPhone="9876543210"
      />
    );

    expect(html).toContain('Activate Wholesaler Account');
    expect(html).toContain('Contact Support on WhatsApp');
    expect(html).toContain('wa.me');
    expect(html).toContain('Master Spares Catalog');
    expect(html).toContain('B2B Client Credit');
    expect(html.toLowerCase()).not.toContain('udhar');
    expect(html.toLowerCase()).not.toContain('khata');
  });

  it('renders interactive toggle when settings.isWholesalerApproved is true', () => {
    const approvedSettings: AppSettings = {
      ...baseSettings,
      isWholesalerApproved: true,
    };

    const html = renderToString(
      <MemoryRouter>
        <SettingsScreen
          settings={approvedSettings}
          language="en"
          onLanguageChange={() => {}}
          onRefreshSettings={() => {}}
        />
      </MemoryRouter>
    );

    expect(html).toContain('Wholesale &amp; Spares Mode');
    // Interactive segmented control options rendered
    expect(html).toContain('Off');
    expect(html).toContain('On');
  });

  it('renders OnboardingScreen with shop type selection and wholesale activation modal', () => {
    const html = renderToString(
      <MemoryRouter>
        <OnboardingScreen onComplete={() => {}} />
      </MemoryRouter>
    );

    expect(html).toContain('Shop Type');
    expect(html).toContain('Retail Shop');
    expect(html).toContain('Spare Wholesaler');
  });

  it('provides setAccountWholesalerStatus function for remote superadmin approval', async () => {
    const res = await setAccountWholesalerStatus('', true);
    expect(res.isWholesalerApproved).toBe(true);

    const revoked = await setAccountWholesalerStatus('', false);
    expect(revoked.isWholesalerApproved).toBe(false);
  });
});
