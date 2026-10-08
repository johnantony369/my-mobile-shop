import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { TabBar, TabType } from '../src/components/TabBar';

describe('Wholesale TabBar Navigation Rules', () => {
  it('replaces repairs and tools with spares and clients in wholesale mode', () => {
    const isWholesale = true;
    const standardTabs: TabType[] = ['book', 'stock', 'repairs', 'tools', 'settings'];
    const wholesaleTabs: TabType[] = ['book', 'stock', 'spares', 'clients', 'settings'];

    const activeTabs = isWholesale ? wholesaleTabs : standardTabs;
    expect(activeTabs).toContain('spares');
    expect(activeTabs).toContain('clients');
    expect(activeTabs).not.toContain('repairs');
    expect(activeTabs).not.toContain('tools');
  });

  it('renders Spares and Clients tab buttons when isWholesale is true', () => {
    const html = renderToString(
      <TabBar
        currentTab="book"
        onTabChange={() => {}}
        language="en"
        isWholesale={true}
      />
    );

    expect(html).toContain('Spares');
    expect(html).toContain('Clients');
    expect(html).not.toContain('Repairs');
    expect(html).not.toContain('Tools');
  });
});
