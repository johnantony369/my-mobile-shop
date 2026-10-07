import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { PrivacyScreen } from '../src/screens/legal/PrivacyScreen';
import { TermsScreen } from '../src/screens/legal/TermsScreen';

describe('Public Legal Screens', () => {
  it('renders PrivacyScreen with required sections and support contact', () => {
    const html = renderToString(
      <MemoryRouter>
        <PrivacyScreen />
      </MemoryRouter>
    );

    expect(html).toContain('Privacy Policy');
    expect(html).toContain('support@mymobileshop.online');
    expect(html).toContain('IndexedDB');
    expect(html).toContain('Firebase');
  });

  it('renders TermsScreen with required terms', () => {
    const html = renderToString(
      <MemoryRouter>
        <TermsScreen />
      </MemoryRouter>
    );

    expect(html).toContain('Terms of Service');
    expect(html).toContain('My Mobile Shop');
    expect(html).toContain('support@mymobileshop.online');
  });
});
