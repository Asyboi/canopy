/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canopy: {
          green: '#22c55e',
          'green-dark': '#16a34a',
          'green-dim': '#166534',
          bg: '#0a0f0a',
          surface: '#111811',
          card: '#1a2318',
          border: '#2a3828',
          text: '#e2f0e2',
          muted: '#7a9478',
        },
        tier: {
          high: '#ef4444',
          'high-bg': '#2d1515',
          medium: '#f59e0b',
          'medium-bg': '#2d2310',
          low: '#22c55e',
          'low-bg': '#0f2d14',
        },
      },
    },
  },
  plugins: [],
}
