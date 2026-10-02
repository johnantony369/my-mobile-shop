import { useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { logout } from './auth';
import { auth, isFirebaseConfigured } from './config';
import { startAutoSync, syncNow, SyncState } from './sync';

export interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  syncState: SyncState;
  lastSyncTime: Date | null;
  syncError: string | null;
  triggerSync: () => Promise<void>;
  signOut: () => Promise<void>;
  reloadUser: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(() => auth?.currentUser || null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured || !auth) {
      setLoading(false);
      setSyncState('offline');
      return;
    }

    let isMounted = true;
    let authReady = false;

    // 1. Listen for auth changes (sign in, sign out, user switch)
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      if (!isMounted) return;
      if (currentUser) {
        setUser(currentUser);
        localStorage.setItem('mms_authenticated', 'true');
        localStorage.setItem('mms_user_id', currentUser.uid);
        setLoading(false);
      } else if (authReady) {
        // Only set user to null after initial persistence restore is ready
        setUser(null);
        localStorage.removeItem('mms_authenticated');
        localStorage.removeItem('mms_user_id');
        setLoading(false);
      }
    });

    // 2. Wait for authStateReady() so persisted credentials from IndexedDB are completely restored
    if (typeof auth.authStateReady === 'function') {
      auth.authStateReady()
        .then(() => {
          if (!isMounted) return;
          authReady = true;
          if (auth?.currentUser) {
            setUser(auth.currentUser);
            localStorage.setItem('mms_authenticated', 'true');
            localStorage.setItem('mms_user_id', auth.currentUser.uid);
          } else {
            setUser(null);
            localStorage.removeItem('mms_authenticated');
            localStorage.removeItem('mms_user_id');
          }
          setLoading(false);
        })
        .catch(err => {
          console.warn('authStateReady error:', err);
          if (isMounted) {
            authReady = true;
            setLoading(false);
          }
        });
    } else {
      authReady = true;
    }

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [configured]);

  // Bind auto-sync when user changes
  useEffect(() => {
    if (!user) {
      setSyncState('idle');
      return;
    }

    const unsubscribeSync = startAutoSync(user.uid, (state, lastSync, errorMsg) => {
      setSyncState(state);
      if (lastSync) setLastSyncTime(lastSync);
      if (state === 'error') {
        setSyncError(errorMsg || 'Sync failed. Please check internet connection.');
      } else {
        setSyncError(null);
      }
    });

    return () => unsubscribeSync();
  }, [user]);

  const triggerSync = useCallback(async () => {
    if (!user) return;
    setSyncState('syncing');
    const res = await syncNow(user.uid);
    if (res.success) {
      setSyncState('synced');
      setLastSyncTime(new Date());
      setSyncError(null);
    } else {
      setSyncState('error');
      setSyncError(res.error || 'Sync failed');
    }
  }, [user]);

  const signOut = useCallback(async () => {
    localStorage.removeItem('mms_authenticated');
    localStorage.removeItem('mms_user_id');
    await logout();
    setUser(null);
    setSyncState('idle');
  }, []);

  const reloadUser = useCallback(async () => {
    if (auth?.currentUser) {
      await auth.currentUser.reload();
      setUser({ ...auth.currentUser } as User);
    }
  }, []);

  return {
    user,
    loading,
    isConfigured: configured,
    syncState,
    lastSyncTime,
    syncError,
    triggerSync,
    signOut,
    reloadUser,
  };
}
