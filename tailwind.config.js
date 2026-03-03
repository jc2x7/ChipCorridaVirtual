/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#EF4444',
          dark: '#DC2626',
          light: '#FCA5A5',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          card: '#F8FAFC',
          dark: '#0F172A',
        },
        brand: {
          50: '#FFF1F2',
          100: '#FFE4E6',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
