import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { AddEditJobSheet } from '../src/screens/AddEditJobSheet';
import { StockPickerSheet } from '../src/components/StockPickerSheet';
import { DeviceAutoSuggest } from '../src/components/DeviceAutoSuggest';
import { StockItem } from '../src/types';

describe('New Job Form Enhancements', () => {
  it('renders clean default placeholders without confusing dummy examples', () => {
    const html = renderToString(
      React.createElement(AddEditJobSheet, {
        isOpen: true,
        onClose: () => {},
        onSaved: () => {},
        jobToEdit: null,
        language: 'en',
      })
    );

    // Default placeholders
    expect(html).toContain('placeholder="Customer Name"');
    expect(html).toContain('placeholder="Mobile Number"');
    expect(html).toContain('placeholder="Device Name (e.g. Redmi Note 10 Pro, iPhone 13)"');
    expect(html).toContain('placeholder="Fault / Issue (e.g. Screen broken, not charging)"');
  });

  it('renders multi-select capabilities in StockPickerSheet', () => {
    const mockServices: StockItem[] = [
      { id: 1, name: 'Screen Replacement', category: 'service', sellingPrice: 2000, syncStatus: 'synced', updatedAt: '2026-01-01' },
      { id: 2, name: 'Battery Replacement', category: 'service', sellingPrice: 1200, syncStatus: 'synced', updatedAt: '2026-01-01' },
    ];

    const html = renderToString(
      React.createElement(StockPickerSheet, {
        isOpen: true,
        onClose: () => {},
        onSelect: () => {},
        multiple: true,
        selectedItems: [mockServices[0]],
        language: 'en',
        defaultFilter: 'service',
        title: 'Select Services',
      })
    );

    expect(html).toContain('Select Services');
    expect(html).toContain('Done');
    expect(html).toContain('1 selected');
  });

  it('renders DeviceAutoSuggest input with clear button when populated', () => {
    const htmlEmpty = renderToString(
      React.createElement(DeviceAutoSuggest, {
        value: '',
        onChange: () => {},
      })
    );
    expect(htmlEmpty).toContain('placeholder="Search device model');
    expect(htmlEmpty).not.toContain('aria-label="Clear device model"');

    const htmlFilled = renderToString(
      React.createElement(DeviceAutoSuggest, {
        value: 'OnePlus 11',
        onChange: () => {},
      })
    );
    expect(htmlFilled).toContain('value="OnePlus 11"');
    expect(htmlFilled).toContain('aria-label="Clear device model"');
  });
});
