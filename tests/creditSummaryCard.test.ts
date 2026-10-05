import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SummaryCard } from '../src/components/SummaryCard';
import { DaySummary } from '../src/types';

describe('SummaryCard Credit Pill', () => {
  it('renders credit pill when creditTotal > 0', () => {
    const summary: DaySummary = {
      inTotal: 2500,
      outTotal: 500,
      net: 2000,
      inCount: 2,
      cashTotal: 1000,
      upiTotal: 500,
      cardTotal: 0,
      creditTotal: 1000,
    };

    const html = renderToString(
      React.createElement(SummaryCard, {
        summary,
        dateDisplay: '5 Oct 2026',
        shopName: 'Test Shop',
        language: 'en',
      })
    );

    expect(html).toContain('Credit:');
    expect(html).toContain('1,000');
  });

  it('does not render credit pill when creditTotal === 0', () => {
    const summary: DaySummary = {
      inTotal: 1500,
      outTotal: 500,
      net: 1000,
      inCount: 2,
      cashTotal: 1000,
      upiTotal: 500,
      cardTotal: 0,
      creditTotal: 0,
    };

    const html = renderToString(
      React.createElement(SummaryCard, {
        summary,
        dateDisplay: '5 Oct 2026',
        shopName: 'Test Shop',
        language: 'en',
      })
    );

    expect(html).not.toContain('Credit:');
  });
});
