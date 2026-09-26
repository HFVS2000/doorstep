/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: 'var(--brand)', dark: 'var(--brand-dark)', soft: 'var(--brand-soft)' },
        accent: { DEFAULT: 'var(--accent)', soft: 'var(--accent-soft)' },
        ink: '#0A0A0A',
        go: { DEFAULT: '#00873C', soft: '#DDF5E6' },
        na: '#9AA0A6',
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible"', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Barlow Condensed"', '"Arial Narrow"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
