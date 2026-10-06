import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, saveJobPhotos, getJobPhotos, deleteJobPhoto } from '../src/db/db';

describe('Dexie v7 jobPhotos Table and CRUD', () => {
  beforeEach(async () => {
    if (db.jobPhotos) await db.jobPhotos.clear();
  });

  it('saves and retrieves job photos by jobCloudId', async () => {
    const jobCloudId = 'job_test_123';
    await saveJobPhotos(jobCloudId, [
      {
        photoId: 'p_1',
        dataUrl: 'data:image/jpeg;base64,1234',
        label: 'Front screen',
      },
      {
        photoId: 'p_2',
        dataUrl: 'data:image/jpeg;base64,5678',
        label: 'Back camera',
      },
    ]);

    const photos = await getJobPhotos(jobCloudId);
    expect(photos).toHaveLength(2);
    expect(photos[0].photoId).toBe('p_1');
    expect(photos[0].uploadStatus).toBe('pending');
    expect(photos[0].jobCloudId).toBe(jobCloudId);
    expect(photos[1].photoId).toBe('p_2');
  });

  it('deletes a single job photo by photoId', async () => {
    const jobCloudId = 'job_test_456';
    await saveJobPhotos(jobCloudId, [
      { photoId: 'p_del_1', dataUrl: 'data:image/jpeg;base64,111' },
      { photoId: 'p_del_2', dataUrl: 'data:image/jpeg;base64,222' },
    ]);

    await deleteJobPhoto('p_del_1');
    const remaining = await getJobPhotos(jobCloudId);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].photoId).toBe('p_del_2');
  });

  it('filters out deleted photos in getJobPhotos', async () => {
    const jobCloudId = 'job_test_789';
    await saveJobPhotos(jobCloudId, [
      { photoId: 'p_active', dataUrl: 'data:image/jpeg;base64,active' },
      { photoId: 'p_soft_del', dataUrl: 'data:image/jpeg;base64,del', deletedAt: new Date().toISOString(), syncStatus: 'deleted' },
    ]);

    const photos = await getJobPhotos(jobCloudId);
    expect(photos).toHaveLength(1);
    expect(photos[0].photoId).toBe('p_active');
  });

  it('does not duplicate existing photo on saveJobPhotos', async () => {
    const jobCloudId = 'job_test_dup';
    await saveJobPhotos(jobCloudId, [
      { photoId: 'p_dup', dataUrl: 'data:image/jpeg;base64,first' },
    ]);
    await saveJobPhotos(jobCloudId, [
      { photoId: 'p_dup', dataUrl: 'data:image/jpeg;base64,second' },
    ]);

    const photos = await getJobPhotos(jobCloudId);
    expect(photos).toHaveLength(1);
    expect(photos[0].dataUrl).toBe('data:image/jpeg;base64,first');
  });
});
