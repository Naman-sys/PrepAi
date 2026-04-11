/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Poppins', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
      },
      keyframes: {
        ringPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.08)', opacity: '0.35' },
        },
        wave: {
          '0%, 100%': { height: '6px' },
          '50%': { height: '20px' },
        },
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        countdownPop: {
          '0%': { transform: 'scale(0.86)', opacity: '0' },
          '35%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(1.1)', opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        floatBlob: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(50px, -50px) scale(1.05)' },
          '66%': { transform: 'translate(-40px, 30px) scale(0.95)' },
        },
        flowLine: {
          '0%': { strokeDashoffset: '360' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        ringPulse: 'ringPulse 1.05s ease-in-out infinite',
        wave: 'wave 1s ease-in-out infinite',
        blink: 'blink 1.1s steps(2, start) infinite',
        countdownPop: 'countdownPop 1s ease-in-out',
        slideUp: 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        floatBlob: 'floatBlob 25s ease-in-out infinite',
        flowLine: 'flowLine 15s linear infinite',
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        elegant: '0 10px 40px -10px rgba(0, 0, 0, 0.08)',
      },
      colors: {
        brand: {
          50: '#f8f9fa',
          100: '#f1f3f5',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#ced4da',
          500: '#111111', // Pure classic dark
          600: '#000000',
          700: '#000000',
          800: '#000000',
          900: '#000000',
        },
      },
    },
  },
  plugins: [],
}
