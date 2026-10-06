import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, updateAppSettings, cleanIndianPhone, isValidIndianPhone } from '../src/db/db';
import { buildPublicRepairTrack } from '../src/firebase/sync';
import { AppSettings, Job } from '../src/types';

describe('Shop WhatsApp Number & Logo in Settings', () => {
  beforeEach(async () => {
    if (db.settings) await db.settings.clear();
    if (db.jobs) await db.jobs.clear();
  });

  it('validates and cleans 10-digit Indian WhatsApp phone numbers', () => {
    expect(isValidIndianPhone('9876543210')).toBe(true);
    expect(isValidIndianPhone('+91 98765 43210')).toBe(true);
    expect(cleanIndianPhone('+91 98765 43210')).toBe('9876543210');
    expect(isValidIndianPhone('12345')).toBe(false);
    expect(isValidIndianPhone('abcd')).toBe(false);
  });

  it('saves shopPhone and shopLogo in AppSettings', async () => {
    const initialSettings: AppSettings = {
      shopName: 'Test Tech Care',
      language: 'en',
      firstLaunchDate: '2026-10-01',
      activated: true,
      lastBackupAt: null,
      showRepairs: true,
    };
    await db.settings.add(initialSettings);

    await updateAppSettings({
      shopName: 'Test Tech Care',
      shopAddress: '123 Market St, Calicut',
      shopPhone: '9876543210',
      shopLogo: 'data:image/jpeg;base64,mocklogodata',
    });

    const updated = await db.settings.toCollection().first();
    expect(updated).toBeDefined();
    expect(updated?.shopPhone).toBe('9876543210');
    expect(updated?.shopLogo).toBe('data:image/jpeg;base64,mocklogodata');
    expect(updated?.shopAddress).toBe('123 Market St, Calicut');
  });

  it('clears shopLogo and shopPhone when undefined or null', async () => {
    const initialSettings: AppSettings = {
      shopName: 'Test Tech Care',
      shopPhone: '9876543210',
      shopLogo: 'data:image/jpeg;base64,mocklogodata',
      language: 'en',
      firstLaunchDate: '2026-10-01',
      activated: true,
      lastBackupAt: null,
      showRepairs: true,
    };
    await db.settings.add(initialSettings);

    await updateAppSettings({
      shopName: 'Test Tech Care',
      shopPhone: undefined,
      shopLogo: undefined,
    });

    const updated = await db.settings.toCollection().first();
    expect(updated?.shopPhone).toBeUndefined();
    expect(updated?.shopLogo).toBeUndefined();
  });

  it('propagates shopPhone and shopLogo into buildPublicRepairTrack', () => {
    const sampleJob: Job = {
      cloudId: 'job_track_123',
      customerName: 'Rohit',
      phone: '9876543210',
      model: 'OnePlus 11',
      complaint: 'Screen replacement',
      status: 'received',
      advance: 500,
      receivedAt: Date.now(),
    };

    const settings: AppSettings = {
      shopName: 'Apex Mobile Care',
      shopAddress: 'MG Road, Kochi',
      shopPhone: '9847012345',
      shopLogo: 'data:image/jpeg;base64,apexlogo',
      language: 'en',
      firstLaunchDate: '2026-10-01',
      activated: true,
      lastBackupAt: null,
      showRepairs: true,
    };

    const publicTrack = buildPublicRepairTrack(sampleJob, settings);
    expect(publicTrack.shopName).toBe('Apex Mobile Care');
    expect(publicTrack.shopPhone).toBe('9847012345');
    expect(publicTrack.shopLogo).toBe('data:image/jpeg;base64,apexlogo');
  });
});
