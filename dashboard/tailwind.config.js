/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canopy: {
          bg:           '#0B1410',
          surface:      '#111B17',
          card:         '#1A2822',
          border:       'rgba(120,170,145,0.18)',
          accent:       '#3FAF74',
          'accent-dim': '#2A7A52',
          'accent-glow':'rgba(63,175,116,0.15)',
          text:         '#E6F2EC',
          secondary:    '#B8C8C0',
          muted:        '#7D948A',
          // legacy aliases kept for any remaining references
          green:        '#3FAF74',
          'green-dark': '#2A7A52',
          'green-dim':  '#2A7A52',
        },
        tier: {
          high:          '#D97A5F',
          'high-bg':     '#2D1A14',
          medium:        '#D6B86A',
          'medium-bg':   '#2D2510',
          low:           '#4FCB82',
          'low-bg':      '#0F2A18',
        },
        sci: {
          e: '#60A5FA',
          i: '#A78BFA',
          m: '#FBBF24',
          r: '#34D399',
        },
      },
      keyframes: {
        'canopy-fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'canopy-pulse-ring': {
          '0%':   { opacity: '0.6', transform: 'scale(1)' },
          '100%': { opacity: '0',   transform: 'scale(1.5)' },
        },
      },
      animation: {
        'fade-up':    'canopy-fade-up 200ms ease-out forwards',
        'pulse-ring': 'canopy-pulse-ring 1.4s ease-out infinite',
      },
    },
  },
  plugins: [],
}
