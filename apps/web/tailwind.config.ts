/** @type {import('tailwindcss').Config} */
module.exports = {
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
          bg: '#0A0A0B',
          surface: '#141416',
          border: '#2A2A2E',
        },
      },
    },
  },
  plugins: [],
};
