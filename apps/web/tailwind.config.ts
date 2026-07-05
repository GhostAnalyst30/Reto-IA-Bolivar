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
          amber: '#F28C28',
          orange: '#F28C28',
          blue: '#003A70',
          'blue-mid': '#005B96',
          'blue-light': '#4A90C2',
          bg: 'var(--bg)',
          surface: 'var(--surface)',
          border: 'var(--border)',
        },
        foreground: 'var(--text)',
        muted: 'var(--muted)',
        privacy: '#6366F1',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Newsreader', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
