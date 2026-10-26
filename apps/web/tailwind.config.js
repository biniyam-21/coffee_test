/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FAF9FC',
          100: '#F1EBFC',
          200: '#EAE6F0',
          300: '#D4C6F7',
          400: '#A47CF0',
          500: '#8A51EC',
          600: '#7138E8', // Primary Akufada Brand Purple (#7138E8)
          700: '#5C25D4',
          800: '#43179E',
          900: '#281746', // Deep purple (#281746)
          950: '#191525', // Ink (#191525)
          primary: '#7138E8',
          deep: '#281746',
          ink: '#191525',
          bg: '#FAF9FC',
          surface: '#FFFFFF',
          secondary: '#716B80',
          border: '#EAE6F0',
          subtle: '#F1EBFC',
          success: '#16845B',
          error: '#C43D4B',
          accent: '#E7C8A0',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card-subtle':
          '0 2px 10px -2px rgba(25, 21, 37, 0.04), 0 1px 3px -1px rgba(25, 21, 37, 0.03)',
        'card-hover':
          '0 12px 28px -6px rgba(40, 23, 70, 0.09), 0 4px 12px -2px rgba(40, 23, 70, 0.04)',
        'auth-card':
          '0 20px 45px -10px rgba(36, 17, 63, 0.12), 0 10px 20px -5px rgba(36, 17, 63, 0.06)',
      },
    },
  },
  plugins: [],
};
