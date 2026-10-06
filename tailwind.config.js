/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        iosBg: '#F6F5F3',
        iosCard: '#FFFFFF',
        iosBlue: '#007AFF',
        iosGreen: '#34C759',
        iosRed: '#FF3B30',
        iosOrange: '#FF9500',
        iosSeparator: '#E5E5EA',
        iosLabel: '#171717',
        iosSecondary: '#6B6B6B',
        iosFill: '#767680',
        salonAccent: '#C58B8B',
        salonAccentSoft: '#F3E5E5',
        salonWarm: '#EDE8E3',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro"',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        ios: '16px',
        card: '18px',
        surface: '20px',
      },
    },
  },
  plugins: [],
}
