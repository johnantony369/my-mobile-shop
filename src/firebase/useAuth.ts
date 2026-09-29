import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { subscribeToAuthChanges, logout } from './auth';
import { isFirebaseConfigured } from './config';
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
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      setSyncState('offline');
      return;
    }

    const unsubscribeAuth = subscribeToAuthChanges(currentUser => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, [configured]);

  // Bind auto-sync when user changes
  useEffect(() => {
    if (!user) {
      setSyncState('idle');
      return;
    }

    const unsubscribeSync = startAutoSync(user.uid, (state, lastSync) => {
      setSyncState(state);
      if (lastSync) setLastSyncTime(lastSync);
      if (state === 'error') {
        setSyncError('Sync failed. Please check internet connection.');
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
    await logout();
    setUser(null);
    setSyncState('idle');
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
  };
}
