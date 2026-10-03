import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from './AppRouter';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { registerSW } from 'virtual:pwa-register';

// Register service worker with silent auto-update:
// When a new SW is found, activate it immediately (updateSW(true) triggers
// skipWaiting + clients.claim so the page reloads on the new version).
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] New version available — activating silently...');
    updateSW(true);
  },
  onOfflineReady() {
    console.log('[PWA] App ready to work 100% offline.');
  },
});

// Auto-reload the app when the new Service Worker takes control
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

// Periodically check for a new service worker (every 60 minutes).
// This covers long-running sessions where the user never closes the tab.
const SW_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const checkForUpdate = () => {
  navigator.serviceWorker?.getRegistration().then((reg) => {
    reg?.update().catch(() => { /* network may be unavailable */ });
  });
};
setInterval(checkForUpdate, SW_CHECK_INTERVAL_MS);

// Also check when the tab re-gains focus or the device comes back online.
// These are the most common moments users encounter a new version.
window.addEventListener('focus', checkForUpdate);
window.addEventListener('online', checkForUpdate);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  </React.StrictMode>
);
