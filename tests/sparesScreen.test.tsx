import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SparesScreen } from '../src/screens/wholesale/SparesScreen';

describe('SparesScreen Component', () => {
  it('renders search input and brand filter chips', () => {
    const html = renderToString(<SparesScreen language="en" />);
    expect(html).toContain('Search phone model or spare part...');
    expect(html).toContain('Xiaomi');
    expect(html).toContain('Samsung');
    expect(html).toContain('Vivo');
    expect(html).toContain('+ Add Phone Model');
    expect(html).toContain('+ Add Spare Part');
  });
});
