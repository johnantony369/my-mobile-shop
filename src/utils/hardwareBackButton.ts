import { App as CapApp } from '@capacitor/app';
import { isAndroidNativeApp } from './platform';

type BackHandler = () => boolean; // return true if handled (consumed), false if unhandled
const backHandlers: BackHandler[] = [];

/**
 * Registers a handler for the hardware back button.
 * Handlers are executed in reverse order (LIFO: topmost modal first).
 * If a handler returns true, the back event is considered consumed.
 */
export function registerBackButtonHandler(handler: BackHandler): () => void {
  backHandlers.push(handler);
  return () => {
    const idx = backHandlers.indexOf(handler);
    if (idx !== -1) {
      backHandlers.splice(idx, 1);
    }
  };
}

let isInitialized = false;

/**
 * Initializes the Capacitor hardware back button listener.
 */
export function initHardwareBackButton(): void {
  if (isInitialized) return;
  if (!isAndroidNativeApp()) return;

  try {
    CapApp.addListener('backButton', ({ canGoBack }) => {
      // Execute the most recently registered handler (LIFO)
      for (let i = backHandlers.length - 1; i >= 0; i--) {
        const handled = backHandlers[i]();
        if (handled) return;
      }

      // If no modal or handler consumed it:
      if (canGoBack && typeof window !== 'undefined' && window.history.length > 1) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });
    isInitialized = true;
  } catch (err) {
    console.warn('Could not initialize hardware back button listener:', err);
  }
}
