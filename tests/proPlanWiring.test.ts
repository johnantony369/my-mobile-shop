import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, rel), 'utf-8');

describe('Pro plan wiring (monthly / yearly / lifetime)', () => {
  it('admin API grants a plan with expiry to both accounts and user settings docs', () => {
    const src = read('../src/firebase/admin.ts');
    expect(src).toContain('export async function setAccountPlan');
    expect(src).toContain('computeProExpiry');
    // written to accounts/{uid} and users/{uid}/settings/appSettings
    expect(src.match(/proExpiresAt/g)!.length).toBeGreaterThanOrEqual(4);
    expect(src).not.toContain('toggleAccountPro');
  });

  it('AdminScreen offers the plan picker and a separate confirmed revoke', () => {
    const src = read('../src/screens/AdminScreen.tsx');
    expect(src).toContain('<ProPlanDialog');
    expect(src).toContain('Change Plan');
    expect(src).toContain('Revoke Pro?');
    expect(src).not.toContain('window.confirm');
  });

  it('ProPlanDialog lists all three plans', () => {
    const src = read('../src/components/ProPlanDialog.tsx');
    expect(src).toContain('PRO_PLANS.map');
    const util = read('../src/utils/proPlan.ts');
    expect(util).toMatch(/PRO_PLANS: ProPlan\[\] = \['monthly', 'yearly', 'lifetime'\]/);
  });

  it('the app enforces expiry instead of trusting the raw activated flag', () => {
    expect(read('../src/App.tsx')).toContain('isProCurrentlyActive(settings)');
    expect(read('../src/screens/SettingsScreen.tsx')).toContain('isProCurrentlyActive(settings)');
    const sync = read('../src/firebase/sync.ts');
    expect(sync).toContain('isProCurrentlyActive(localSettings)');
    expect(sync).toContain('isProCurrentlyActive(accountData)');
  });

  it('activation codes grant lifetime and clear any stale expiry', () => {
    expect(read('../src/components/PaywallModal.tsx')).toContain("proPlan: 'lifetime', proExpiresAt: null");
    expect(read('../src/screens/SettingsScreen.tsx')).toContain("proPlan: 'lifetime', proExpiresAt: null");
  });
});
