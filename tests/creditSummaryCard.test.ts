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
    expect(html).toContain('whitespace-nowrap');
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

  it('renders unified 2-column In/Out with prominent Net below and tabular-nums', () => {
    const summary: DaySummary = {
      inTotal: 150000,
      outTotal: 45000,
      net: 105000,
      inCount: 12,
      cashTotal: 100000,
      upiTotal: 50000,
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

    expect(html).toContain('text-[32px] sm:text-[36px]');
    expect(html).toContain('1,05,000');
    expect(html).toContain('grid grid-cols-2');
    expect(html).toContain('tabular-nums');
  });

  it('renders consistent unified layout even for small amounts', () => {
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

    expect(html).toContain('grid grid-cols-2');
    expect(html).toContain('1,000');
    expect(html).toContain('tabular-nums');
    expect(html).toContain('text-[32px] sm:text-[36px]');
  });
});
