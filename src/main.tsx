import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { registerSW } from 'virtual:pwa-register';

// Register service worker with auto-refresh on new version
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('New update available, activating...');
    updateSW(true);
  },
  onOfflineReady() {
    console.log('App ready to work 100% offline.');
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
