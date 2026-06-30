/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          amber: '#C9A227',
          blue: '#1A2744',
          bg: 'var(--bg)',
          surface: 'var(--surface)',
          border: 'var(--border)',
        },
        foreground: 'var(--text)',
        muted: 'var(--muted)',
      },
    },
  },
  plugins: [],
};
