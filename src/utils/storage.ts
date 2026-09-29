export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        const granted = await navigator.storage.persist();
        return granted;
      }
      return true;
    } catch (e) {
      console.warn('Persistent storage request failed:', e);
      return false;
    }
  }
  return false;
}
