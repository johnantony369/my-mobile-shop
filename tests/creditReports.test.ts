import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ReportsScreen } from '../src/screens/ReportsScreen';

describe('ReportsScreen Credit Tracking', () => {
  it('renders payment breakdown containing Credit', () => {
    const html = renderToString(
      React.createElement(ReportsScreen, {
        language: 'en',
        shopName: 'Test Shop',
      })
    );

    expect(html).toContain('Credit');
    expect(html).toContain('Cash');
    expect(html).toContain('UPI');
    expect(html).toContain('Card');
  });

  it('renders Credit metric card in place of entries card', () => {
    const html = renderToString(
      React.createElement(ReportsScreen, {
        language: 'en',
        shopName: 'Test Shop',
      })
    );

    // Old entries card text should not be present
    expect(html).not.toContain('Total Entries');
    expect(html).not.toContain('Entries');
  });
});
