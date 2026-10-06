import { describe, it, expect } from 'vitest';
import { buildTrackingUrl, buildIntakeSlipMessage, buildReadyNotificationMessage } from '../src/utils/repairs';
import { Job } from '../src/types';

describe('Repair Tracking Feature', () => {
  const sampleJob: Job = {
    id: 101,
    cloudId: 'job_test_123',
    customerName: 'Rahul',
    phone: '9876543210',
    model: 'OnePlus 9',
    complaint: 'Battery draining fast',
    estimate: 1800,
    advance: 500,
    status: 'received',
    receivedAt: 1728234567000,
  };

  it('buildTrackingUrl generates standard tracking URL with trackingId', () => {
    const url = buildTrackingUrl('job_test_123', 'https://mymobileshop.web.app');
    expect(url).toBe('https://mymobileshop.web.app/track/job_test_123');
  });

  it('appends live tracking link to intake slip message when cloudId or trackingUrl is provided', () => {
    const msg = buildIntakeSlipMessage(sampleJob, 'Kerala Mobile Hub', 'https://mymobileshop.web.app/track/job_test_123');
    expect(msg).toContain('OnePlus 9');
    expect(msg).toContain('Battery draining fast');
    expect(msg).toContain('https://mymobileshop.web.app/track/job_test_123');
    expect(msg).toContain('Track');
  });

  it('appends live tracking link to ready notification message when provided', () => {
    const readyJob: Job = { ...sampleJob, status: 'ready' };
    const msg = buildReadyNotificationMessage(readyJob, 'Kerala Mobile Hub', 'https://mymobileshop.web.app/track/job_test_123');
    expect(readyJob.model).toBe('OnePlus 9');
    expect(msg).toContain('https://mymobileshop.web.app/track/job_test_123');
  });

  it('buildPublicRepairTrack creates a sanitized customer-safe payload', async () => {
    const { buildPublicRepairTrack } = await import('../src/firebase/sync');
    const publicTrack = buildPublicRepairTrack(sampleJob, {
      shopName: 'City Mobile Repair',
      shopAddress: 'Near Metro Station, Kochi',
      language: 'en',
      firstLaunchDate: '2026-01-01',
      activated: true,
      lastBackupAt: null,
      showRepairs: true,
    });

    expect(publicTrack.cloudId).toBe('job_test_123');
    expect(publicTrack.shopName).toBe('City Mobile Repair');
    expect(publicTrack.shopAddress).toBe('Near Metro Station, Kochi');
    expect(publicTrack.model).toBe('OnePlus 9');
    expect(publicTrack.complaint).toBe('Battery draining fast');
    expect(publicTrack.estimate).toBe(1800);
    expect(publicTrack.advance).toBe(500);
    expect(publicTrack.balanceDue).toBe(1300);
    expect(publicTrack.status).toBe('received');
  });

  it('renders customer-friendly timeline steps and balance due in TrackRepairView', async () => {
    const React = await import('react');
    const { renderToString } = await import('react-dom/server');
    const { TrackRepairView } = await import('../src/screens/TrackRepairScreen');

    const htmlReceived = renderToString(
      React.createElement(TrackRepairView, {
        repair: {
          cloudId: 'job_123',
          shopName: 'FastFix Mobiles',
          shopAddress: 'MG Road, Ernakulam',
          model: 'iPhone 12',
          complaint: 'Screen shattered',
          status: 'received',
          receivedAt: 1728234567000,
          estimate: 4500,
          advance: 1000,
          balanceDue: 3500,
          updatedAt: new Date().toISOString(),
        },
      })
    );

    // Friendly titles & steps
    expect(htmlReceived).toContain('FastFix Mobiles');
    expect(htmlReceived).toContain('iPhone 12');
    expect(htmlReceived).toContain('Device Received');
    expect(htmlReceived).toContain('Under Service &amp; Diagnosis');
    expect(htmlReceived).toContain('Ready for Pickup');
    expect(htmlReceived).toContain('Delivered');
    expect(htmlReceived).toContain('Thank you for choosing us');
    expect(htmlReceived).toContain('Amount To Pay');

    // Test Ready state
    const htmlReady = renderToString(
      React.createElement(TrackRepairView, {
        repair: {
          cloudId: 'job_123',
          shopName: 'FastFix Mobiles',
          model: 'iPhone 12',
          complaint: 'Screen shattered',
          status: 'ready',
          receivedAt: 1728234567000,
          readyAt: 1728240000000,
          estimate: 4500,
          advance: 1000,
          balanceDue: 3500,
          updatedAt: new Date().toISOString(),
        },
      })
    );

    expect(htmlReady).toContain('Ready for Pickup!');
  });
});
