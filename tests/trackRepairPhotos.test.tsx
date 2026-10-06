import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { TrackRepairView } from '../src/screens/TrackRepairScreen';
import { buildPublicRepairTrack } from '../src/firebase/sync';
import { Job, AppSettings } from '../src/types';

describe('Repair Tracking Photos Display', () => {
  const sampleJob: Job = {
    id: 1,
    cloudId: 'job_photos_test_123',
    customerName: 'Suresh Kumar',
    phone: '9876543210',
    model: 'Samsung S22',
    complaint: 'Cracked screen display',
    status: 'ready',
    receivedAt: Date.now() - 86400000,
    readyAt: Date.now(),
    estimate: 6000,
    advance: 1000,
  };

  const sampleSettings: AppSettings = {
    shopName: 'Super Mobile Hub',
    language: 'en',
    firstLaunchDate: '2026-01-01',
    activated: true,
  };

  const samplePhotos = [
    {
      photoId: 'photo_intake_1',
      dataUrl: 'data:image/jpeg;base64,mockintakephoto',
      tag: 'intake' as const,
      label: 'Cracked screen intake',
      createdAt: Date.now() - 86400000,
    },
    {
      photoId: 'photo_ready_1',
      dataUrl: 'data:image/jpeg;base64,mockreadyphoto',
      tag: 'ready' as const,
      label: 'Fixed screen ready',
      createdAt: Date.now(),
    },
  ];

  it('buildPublicRepairTrack attaches photos array into payload', () => {
    const publicTrack = buildPublicRepairTrack(sampleJob, sampleSettings, samplePhotos);
    expect(publicTrack.photos).toBeDefined();
    expect(publicTrack.photos?.length).toBe(2);
    expect(publicTrack.photos?.[0].photoId).toBe('photo_intake_1');
    expect(publicTrack.photos?.[1].tag).toBe('ready');
  });

  it('renders both intake condition photos and repaired photos in TrackRepairView', () => {
    const publicTrack = buildPublicRepairTrack(sampleJob, sampleSettings, samplePhotos);
    const html = renderToString(React.createElement(TrackRepairView, { repair: publicTrack }));

    expect(html).toContain('Device Condition &amp; Work Photos');
    expect(html).toContain('Received Condition');
    expect(html).toContain('Repaired / Ready for Pickup');
    expect(html).toContain('alt="Cracked screen intake"');
    expect(html).toContain('alt="Fixed screen ready"');
    expect(html).toContain('Amount To Pay');
    expect(html).toContain('₹5,000');
  });
});
