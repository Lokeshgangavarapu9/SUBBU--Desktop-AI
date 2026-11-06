import type { Config } from 'tailwindcss';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          base: '#FFF7FA',
          pearl: '#FDFBF9',
          blush: '#FCE4EC',
          lavender: '#F1EAFB',
        },
        sakura: {
          50: '#FFF0F5',
          100: '#FDE4EC',
          200: '#FCD1E0',
          300: '#F5B8CC',
          400: '#EFAFC5',
          500: '#E297B3',
          600: '#C86D8E',
          700: '#9C4C6A',
        },
        lavender: {
          100: '#F4EEFC',
          200: '#E8DCFA',
          300: '#DCD0FF',
          500: '#9E86DA',
          700: '#6E56A8',
        },
        ink: {
          primary: '#514650',
          secondary: '#7A6A74',
          muted: '#9B8D96',
          faint: '#C2B8BF',
        },
        status: {
          successBg: '#E8F8F0',
          successText: '#2B7A56',
          warningBg: '#FFF6E5',
          warningText: '#9A6715',
          errorBg: '#FDECEE',
          errorText: '#B83B52',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Quicksand', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glass: '0 12px 32px -8px rgba(81, 70, 80, 0.08), 0 4px 12px -2px rgba(245, 184, 204, 0.18)',
        'glass-hover': '0 16px 36px -6px rgba(81, 70, 80, 0.12), 0 6px 16px -2px rgba(245, 184, 204, 0.28)',
        capsule: '0 8px 24px -4px rgba(81, 70, 80, 0.08), 0 2px 8px -2px rgba(245, 184, 204, 0.14)',
      },
      backdropBlur: {
        xs: '2px',
        glass: '20px',
        elevated: '24px',
      }
    },
  },
  plugins: [],
} satisfies Config;

