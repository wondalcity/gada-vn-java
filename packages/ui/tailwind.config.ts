import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0669F7',
          hover:   '#0454C5',
          active:  '#07397E',
          on:      '#FFFFFF',
          container:   '#C1DAFF',
          onContainer: '#072857',
          '8':  'rgba(6,105,247,0.08)',
          '16': 'rgba(6,105,247,0.16)',
        },
        secondary: {
          DEFAULT:     '#FDBC08',
          on:          '#3C2C02',
          container:   '#FCECBB',
          onContainer: '#3C2C02',
        },
        tertiary: {
          DEFAULT:     '#00C800',
          on:          '#FFFFFF',
          container:   '#D1F3D3',
          onContainer: '#024209',
        },
        error: {
          DEFAULT:   '#ED1C24',
          hover:     '#AF2A2F',
          on:        '#FFFFFF',
          container: '#FFDCE0',
        },
        surface: {
          DEFAULT:   '#FFFFFF',
          dim:       '#F8F8FA',
          container: '#F2F2F2',
        },
        'on-surface':         '#25282A',
        'on-surface-variant': '#7A7B7A',
        outline: '#DDDDDD',
        disabled: '#B2B2B2',
        scrim: 'rgba(0,0,0,0.30)',
      },
      borderRadius: {
        sm:   '4px',
        full: '24px',
      },
      fontFamily: {
        sans: ['Noto Sans KR', 'Noto Sans', 'system-ui', 'sans-serif'],
      },
      minHeight: {
        touch: '44px',
      },
      maxWidth: {
        app: '480px',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        'slide-up': {
          '0%':   { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        shimmer:   'shimmer 1.5s infinite linear',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in':  'fade-in 0.15s ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config
