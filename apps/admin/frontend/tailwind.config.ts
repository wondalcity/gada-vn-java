import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
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
          DEFAULT:     '#FFC72C',
          on:          '#3C2C02',
          container:   '#FFF3CC',
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
        sm: '4px',
      },
    },
  },
  plugins: [],
} satisfies Config
