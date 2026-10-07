import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { LoadingScreen } from '../src/components/LoadingScreen';

describe('LoadingScreen Component', () => {
  it('renders brand name and default loading text', () => {
    const html = renderToString(<LoadingScreen />);
    expect(html).toContain('My Mobile Shop');
    expect(html).toContain('Loading your shop...');
    expect(html).toContain('icon-192.png');
  });

  it('renders custom message and submessage', () => {
    const html = renderToString(
      <LoadingScreen
        message="Signing in with Google..."
        submessage="Syncing your offline ledger"
      />
    );
    expect(html).toContain('Signing in with Google...');
    expect(html).toContain('Syncing your offline ledger');
  });

  it('shows reload button when timeout is true', () => {
    const html = renderToString(<LoadingScreen timeout={true} onReload={() => {}} />);
    expect(html).toContain('Taking longer than usual to load...');
    expect(html).toContain('Reload App');
  });
});
