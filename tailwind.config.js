/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        iosBg: '#F2F2F7',
        iosCard: '#FFFFFF',
        iosBlue: '#007AFF',
        iosGreen: '#34C759',
        iosRed: '#FF3B30',
        iosSeparator: '#E5E5EA',
        iosLabel: '#000000',
        iosSecondary: '#8E8E93',
        iosFill: '#767680',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        ios: '14px',
      },
    },
  },
  plugins: [],
}
