import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'online.mymobileshop.app',
  appName: 'My Mobile Shop',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#F2F2F7',
    scrollEnabled: false,
  },
};

export default config;
