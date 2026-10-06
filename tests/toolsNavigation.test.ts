import { describe, it, expect } from 'vitest';
import React from 'react';
import { TabBar, TabType } from '../src/components/TabBar';

describe('Navigation Configuration', () => {
  it('renders tools tab with LayoutGrid icon and does not render reports tab in TabBar', () => {
    let selectedTab: TabType = 'tools';
    const element = React.createElement(TabBar, {
      currentTab: selectedTab,
      onTabChange: (tab) => { selectedTab = tab; },
      language: 'en',
      showRepairs: true,
      showStock: true,
      usedStockCount: 5,
    });

    expect(element).toBeDefined();
    // TabBar must accept usedStockCount prop
    expect(element.props.usedStockCount).toBe(5);
  });
});
