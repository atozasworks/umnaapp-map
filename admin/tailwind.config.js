/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        admin: {
          950: '#0c0f14',
          900: '#111827',
          850: '#151c28',
          800: '#1e293b',
          border: '#2d3a4f',
          muted: '#94a3b8',
          accent: '#34d399',
          accentDim: '#059669',
        },
      },
      boxShadow: {
        panel: '0 0 0 1px rgba(45, 58, 79, 0.6), 0 24px 48px -12px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
}
