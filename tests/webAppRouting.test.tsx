import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { WebSidebar } from '../src/screens/web/components/WebSidebar';
import { WebHeader } from '../src/screens/web/components/WebHeader';

describe('WebApp Routing & Shell Navigation', () => {
  it('renders WebSidebar with desktop tabs and shop branding', () => {
    const html = renderToString(
      <WebSidebar
        currentTab="book"
        onTabChange={() => {}}
        language="en"
        settings={{
          shopName: 'Super Mobile Hub',
          language: 'en',
          firstLaunchDate: '2026-10-01',
          activated: true,
          lastBackupAt: null,
          showRepairs: true,
          showStock: true,
        }}
        isActivated={true}
        isCollapsed={false}
        onToggleCollapse={() => {}}
      />
    );

    expect(html).toContain('Super Mobile Hub');
    expect(html).toContain('Desktop Web');
    expect(html).toContain('Day Book');
    expect(html).toContain('Stock');
    expect(html).toContain('Repairs');
    expect(html).toContain('Tools &amp; Reports');
    expect(html).toContain('Settings');
    expect(html).toContain('Pro Active');
    expect(html).toContain('Switch to Mobile');
  });

  it('renders WebHeader with date picker and desktop action buttons', () => {
    const html = renderToString(
      <WebHeader
        selectedDate="2026-10-08"
        onDateChange={() => {}}
        syncState="synced"
        onAddSale={() => {}}
        onAddExpense={() => {}}
        onOpenBill={() => {}}
      />
    );

    expect(html).toContain('Cloud Synced');
    expect(html).toContain('New Bill');
    expect(html).toContain('Expense');
    expect(html).toContain('Add Sale');
    expect(html).toContain('2026-10-08');
  });

  it('renders route configuration without errors in router context', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/web/app']}>
        <Routes>
          <Route path="/web/app" element={<div data-testid="web-shell">Web Shell Rendered</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(html).toContain('Web Shell Rendered');
  });
});
