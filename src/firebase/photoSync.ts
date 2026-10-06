import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../db/db';
import { dataUrlToBlob } from '../utils/image';
import { storage, auth, isFirebaseConfigured } from './config';

let isSyncingPhotos = false;

export async function syncPendingJobPhotos(): Promise<{ uploaded: number; failed: number }> {
  if (isSyncingPhotos) {
    return { uploaded: 0, failed: 0 };
  }

  isSyncingPhotos = true;
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { uploaded: 0, failed: 0 };
    }

    if (!isFirebaseConfigured() || !storage || !auth?.currentUser) {
      return { uploaded: 0, failed: 0 };
    }

    const uid = auth.currentUser.uid;
    if (!db.jobPhotos) return { uploaded: 0, failed: 0 };

    const pendingPhotos = await db.jobPhotos
      .filter((p) => (p.uploadStatus === 'pending' || p.uploadStatus === 'failed') && !p.deletedAt && p.syncStatus !== 'deleted')
      .toArray();

    let uploaded = 0;
    let failed = 0;

    for (const photo of pendingPhotos) {
      if (!photo.dataUrl || !photo.photoId || !photo.jobCloudId) continue;
      try {
        const blob = dataUrlToBlob(photo.dataUrl);
        const storageRef = ref(storage, `users/${uid}/jobs/${photo.jobCloudId}/${photo.photoId}.jpg`);
        await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
        const downloadUrl = await getDownloadURL(storageRef);

        if (photo.id) {
          await db.jobPhotos.update(photo.id, {
            downloadUrl,
            uploadStatus: 'uploaded',
            uploadedAt: Date.now(),
          });
        }
        uploaded++;
      } catch (err) {
        console.warn(`Failed to upload photo ${photo.photoId}:`, err);
        if (photo.id) {
          await db.jobPhotos.update(photo.id, { uploadStatus: 'failed' });
        }
        failed++;
      }
    }

    return { uploaded, failed };
  } finally {
    isSyncingPhotos = false;
  }
}
