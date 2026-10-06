import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { syncPendingJobPhotos } from '../src/firebase/photoSync';
import { db, saveJobPhotos, getJobPhotos } from '../src/db/db';
import { ref, uploadBytes } from 'firebase/storage';
import * as firebaseConfig from '../src/firebase/config';

vi.mock('../src/firebase/config', () => ({
  auth: { currentUser: { uid: 'user_test_123' } },
  isFirebaseConfigured: () => true,
  storage: {},
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn((_storage, path) => ({ fullPath: path })),
  uploadBytes: vi.fn().mockResolvedValue({}),
  getDownloadURL: vi.fn().mockResolvedValue('https://firebasestorage.googleapis.com/test.jpg'),
}));

describe('Photo cloud sync worker', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    if (db.jobPhotos) await db.jobPhotos.clear();
  });

  it('uploads pending photos and updates downloadUrl and status', async () => {
    await saveJobPhotos('job_sync_1', [
      { photoId: 'p_sync_1', dataUrl: 'data:image/jpeg;base64,123' },
    ]);

    const result = await syncPendingJobPhotos();
    expect(result.uploaded).toBe(1);
    expect(result.failed).toBe(0);

    const updated = await getJobPhotos('job_sync_1');
    expect(updated[0].uploadStatus).toBe('uploaded');
    expect(updated[0].downloadUrl).toContain('firebasestorage');
    expect(updated[0].uploadedAt).toBeTypeOf('number');
    expect(ref).toHaveBeenCalledWith(
      expect.anything(),
      'users/user_test_123/jobs/job_sync_1/p_sync_1.jpg'
    );
  });

  it('retries previously failed photos', async () => {
    await saveJobPhotos('job_sync_failed', [
      { photoId: 'p_failed_1', dataUrl: 'data:image/jpeg;base64,123', uploadStatus: 'failed' },
    ]);

    const result = await syncPendingJobPhotos();
    expect(result.uploaded).toBe(1);

    const updated = await getJobPhotos('job_sync_failed');
    expect(updated[0].uploadStatus).toBe('uploaded');
  });

  it('does not re-upload already uploaded photos', async () => {
    await saveJobPhotos('job_sync_uploaded', [
      { photoId: 'p_up_1', dataUrl: 'data:image/jpeg;base64,123', uploadStatus: 'uploaded' },
    ]);

    const result = await syncPendingJobPhotos();
    expect(result.uploaded).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('handles upload failure gracefully and marks status as failed', async () => {
    vi.mocked(uploadBytes).mockRejectedValueOnce(new Error('Network error'));

    await saveJobPhotos('job_sync_fail', [
      { photoId: 'p_err_1', dataUrl: 'data:image/jpeg;base64,123' },
    ]);

    const result = await syncPendingJobPhotos();
    expect(result.uploaded).toBe(0);
    expect(result.failed).toBe(1);

    const updated = await getJobPhotos('job_sync_fail');
    expect(updated[0].uploadStatus).toBe('failed');
  });

  it('returns { uploaded: 0, failed: 0 } when user is not logged in', async () => {
    const originalAuth = firebaseConfig.auth;
    (firebaseConfig as any).auth = { currentUser: null };

    await saveJobPhotos('job_sync_no_auth', [
      { photoId: 'p_no_auth', dataUrl: 'data:image/jpeg;base64,123' },
    ]);

    const result = await syncPendingJobPhotos();
    expect(result).toEqual({ uploaded: 0, failed: 0 });

    (firebaseConfig as any).auth = originalAuth;
  });

  it('returns { uploaded: 0, failed: 0 } when storage is null', async () => {
    const originalStorage = firebaseConfig.storage;
    (firebaseConfig as any).storage = null;

    await saveJobPhotos('job_sync_no_storage', [
      { photoId: 'p_no_storage', dataUrl: 'data:image/jpeg;base64,123' },
    ]);

    const result = await syncPendingJobPhotos();
    expect(result).toEqual({ uploaded: 0, failed: 0 });

    (firebaseConfig as any).storage = originalStorage;
  });

  it('returns { uploaded: 0, failed: 0 } when navigator is offline', async () => {
    const originalNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: false },
      configurable: true,
      writable: true,
    });

    await saveJobPhotos('job_sync_offline', [
      { photoId: 'p_offline_1', dataUrl: 'data:image/jpeg;base64,123' },
    ]);

    const result = await syncPendingJobPhotos();
    expect(result).toEqual({ uploaded: 0, failed: 0 });

    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });
});
