import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import 'fake-indexeddb/auto';
import { TabBar } from '../src/components/TabBar';
import { initAppSettings, db } from '../src/db/db';

describe('Default Tabs Suite for New Accounts', () => {
  it('initAppSettings sets showRepairs: true and showStock: true by default for all new accounts', async () => {
    await db.settings.clear();
    const settings = await initAppSettings('Quick Phone Care');
    expect(settings.showRepairs).toBe(true);
    expect(settings.showStock).toBe(true);
    expect(settings.wholesaleMode).toBe(false);
  });

  it('TabBar renders all 5 default tabs (Daily Book, Stock, Repairs, Tools, Settings) without requiring props overrides', () => {
    const html = renderToString(
      <TabBar
        currentTab="book"
        onTabChange={() => {}}
        language="en"
      />
    );

    // All 5 core navigation tabs must be present
    expect(html).toContain('Day Book');
    expect(html).toContain('Stock');
    expect(html).toContain('Repairs');
    expect(html).toContain('Tools');
    expect(html).toContain('Settings');
  });
});
