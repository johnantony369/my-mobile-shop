import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import 'fake-indexeddb/auto';
import { db } from '../src/db/db';
import { Job, PublicRepairTrack } from '../src/types';
import { TrackRepairView } from '../src/screens/TrackRepairScreen';

// Ensure browser globals
if (typeof (globalThis as any).alert === 'undefined') {
  (globalThis as any).alert = vi.fn();
}
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    open: vi.fn(),
    location: { origin: 'https://mymobileshop.web.app', pathname: '/app' },
    navigator: { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } },
    history: { length: 1 },
  };
}

describe('Track Repair Screen Back Button & App Navigation', () => {
  beforeEach(async () => {
    await db.jobs.clear();
    await db.settings.clear();
    await db.entries.clear();
  });

  const sampleTrack: PublicRepairTrack = {
    cloudId: 'track_test_88',
    shopName: 'FastFix Mobiles',
    shopAddress: 'MG Road, Kochi',
    shopPhone: '9876543210',
    model: 'Pixel 8',
    complaint: 'Screen replacement',
    status: 'in_progress',
    receivedAt: 1728234567000,
    estimate: 5000,
    advance: 1000,
    balanceDue: 4000,
    updatedAt: new Date().toISOString(),
  };

  it('renders "Back to App" button when isFromApp is true', () => {
    const htmlWithBack = renderToString(
      <TrackRepairView
        repair={sampleTrack}
        isFromApp={true}
        onBack={() => {}}
      />
    );

    expect(htmlWithBack).toContain('aria-label="Back to App"');
    expect(htmlWithBack).toContain('Back to App');
  });

  it('does NOT render "Back to App" button for external customers', () => {
    const htmlCustomer = renderToString(
      <TrackRepairView
        repair={sampleTrack}
        isFromApp={false}
      />
    );

    expect(htmlCustomer).not.toContain('aria-label="Back to App"');
    expect(htmlCustomer).not.toContain('Back to App');
  });

  it('constructs correct return URL with tab=repairs, trackCloudId, and jobId for mobile app', () => {
    const trackingId = 'track_test_88';
    const jobId = 88;
    const isWeb = false;

    const targetBase = isWeb ? '/web/app' : '/app';
    const params = new URLSearchParams();
    params.set('tab', 'repairs');
    params.set('trackCloudId', trackingId);
    params.set('jobId', String(jobId));

    const returnUrl = `${targetBase}?${params.toString()}`;
    expect(returnUrl).toBe('/app?tab=repairs&trackCloudId=track_test_88&jobId=88');
  });

  it('constructs correct return URL for web desktop mode when mode=web', () => {
    const trackingId = 'track_test_88';
    const jobId = 88;
    const isWeb = true;

    const targetBase = isWeb ? '/web/app' : '/app';
    const params = new URLSearchParams();
    params.set('tab', 'repairs');
    params.set('trackCloudId', trackingId);
    params.set('jobId', String(jobId));

    const returnUrl = `${targetBase}?${params.toString()}`;
    expect(returnUrl).toBe('/web/app?tab=repairs&trackCloudId=track_test_88&jobId=88');
  });

  it('cleans up trackCloudId and jobId parameters when job detail sheet closes', () => {
    const params = new URLSearchParams('?tab=repairs&trackCloudId=track_test_88&jobId=88');
    expect(params.has('trackCloudId')).toBe(true);
    expect(params.has('jobId')).toBe(true);

    params.delete('trackCloudId');
    params.delete('jobId');

    expect(params.has('trackCloudId')).toBe(false);
    expect(params.has('jobId')).toBe(false);
    expect(params.get('tab')).toBe('repairs');
    expect(params.toString()).toBe('tab=repairs');
  });

  it('handles popup opener window redirect when window.opener is active', () => {
    const mockOpener = {
      closed: false,
      location: { href: '' },
      focus: vi.fn(),
    };
    const mockClose = vi.fn();

    const originalOpener = (globalThis as any).window?.opener;
    const originalClose = (globalThis as any).window?.close;

    (globalThis as any).window.opener = mockOpener;
    (globalThis as any).window.close = mockClose;

    const returnUrl = '/app?tab=repairs&trackCloudId=track_test_88&jobId=88';

    if (window.opener && !window.opener.closed) {
      window.opener.location.href = returnUrl;
      window.opener.focus();
      window.close();
    }

    expect(mockOpener.location.href).toBe('/app?tab=repairs&trackCloudId=track_test_88&jobId=88');
    expect(mockOpener.focus).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();

    // Restore
    (globalThis as any).window.opener = originalOpener;
    (globalThis as any).window.close = originalClose;
  });
});
