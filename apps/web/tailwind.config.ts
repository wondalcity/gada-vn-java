import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#FF6B2C',
          50: '#FFF3EE',
          100: '#FFE4D4',
          200: '#FFC9A8',
          300: '#FFA67A',
          400: '#FF844E',
          500: '#FF6B2C',
          600: '#E54D0D',
          700: '#C03A07',
          800: '#9B2E05',
          900: '#7A2304',
        },
        construction: {
          dark: '#1A1A2E',
          mid: '#2D2D44',
          light: '#4A4A6A',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        korean: ['var(--font-noto-kr)', 'system-ui'],
      },
    },
  },
  plugins: [],
};

export default config;
