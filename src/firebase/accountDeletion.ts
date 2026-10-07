import { User } from 'firebase/auth';
import { doc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { dbFirestore } from './config';
import { clearLocalDatabase } from '../db/db';

export interface DeleteAccountOptions {
  user: User;
  deleteDocFn?: (ref: any) => Promise<void>;
  clearLocalDbFn?: () => Promise<void>;
}

export interface DeleteAccountResult {
  success: boolean;
  requiresRecentLogin?: boolean;
  error?: string;
}

/**
 * Permanently deletes the user's cloud account and all associated Firestore records,
 * followed by deleting the Firebase Auth user object and clearing IndexedDB locally.
 */
export async function deleteUserAccountAndData(
  options: DeleteAccountOptions
): Promise<DeleteAccountResult> {
  const { user, deleteDocFn, clearLocalDbFn } = options;
  const uid = user.uid;

  try {
    // 1. Delete Firestore user document and metadata if dbFirestore is available
    if (deleteDocFn) {
      await deleteDocFn({ path: `users/${uid}` });
    } else if (dbFirestore) {
      try {
        const subcollections = ['entries', 'jobs', 'stock', 'bills', 'settings'];
        for (const sub of subcollections) {
          const snap = await getDocs(collection(dbFirestore, 'users', uid, sub));
          for (const d of snap.docs) {
            await deleteDoc(d.ref).catch(() => {});
          }
        }
        await deleteDoc(doc(dbFirestore, 'accounts', uid)).catch(() => {});
        await deleteDoc(doc(dbFirestore, 'users', uid)).catch(() => {});
      } catch (cloudErr) {
        console.warn('Non-fatal error clearing Firestore collections during deletion:', cloudErr);
      }
    }

    // 2. Delete Firebase Auth user
    await user.delete();

    // 3. Wipe local IndexedDB
    if (clearLocalDbFn) {
      await clearLocalDbFn();
    } else {
      await clearLocalDatabase();
    }

    return { success: true };
  } catch (err: any) {
    if (err?.code === 'auth/requires-recent-login') {
      return {
        success: false,
        requiresRecentLogin: true,
        error: 'Please sign out and sign back in to verify your identity before deleting your account.',
      };
    }
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred while deleting the account.',
    };
  }
}
