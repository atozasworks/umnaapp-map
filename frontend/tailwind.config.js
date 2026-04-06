/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // OTPVerificationPage & auth pages - ensure same styles in production as localhost
    'card', 'btn-primary', 'input-field', 'glass',
    'min-h-screen', 'flex', 'items-center', 'justify-center', 'px-4', 'py-12',
    'w-full', 'max-w-md', 'text-center', 'mb-8', 'mb-4', 'mb-2', 'mt-2',
    'text-4xl', 'text-2xl', 'text-sm', 'font-bold', 'font-semibold',
    'bg-gradient-to-r', 'from-primary-600', 'to-primary-800', 'bg-clip-text', 'text-transparent',
    'text-slate-800', 'text-slate-600', 'text-slate-700', 'text-red-700', 'text-primary-600',
    'p-3', 'bg-red-50', 'border-red-200', 'rounded-lg', 'space-y-6', 'gap-3',
    'w-14', 'h-14', 'border-2', 'border-slate-300', 'rounded-xl',
    'focus:border-primary-500', 'focus:ring-2', 'focus:ring-primary-200', 'outline-none', 'transition-all',
    { pattern: /^text-(slate|red|primary)-\d+/ },
    { pattern: /^border-(slate|red|primary)-\d+/ },
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
