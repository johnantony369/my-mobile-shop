import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SparesAutoSuggest } from '../src/components/wholesale/SparesAutoSuggest';

describe('SparesAutoSuggest Component', () => {
  it('renders input with neutral placeholder and value', () => {
    const html = renderToString(
      <SparesAutoSuggest
        value="Redmi Note 10"
        onChange={() => {}}
        onSelectPart={() => {}}
        placeholder="Enter item or select spare part..."
      />
    );

    expect(html).toContain('Redmi Note 10');
    expect(html).toContain('placeholder="Enter item or select spare part..."');
  });
});
