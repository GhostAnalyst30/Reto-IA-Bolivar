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
        // FRONT ZIP Material-style brand tokens
        primary: {
          DEFAULT: 'var(--primary)',
          container: 'var(--primary-container)',
          fixed: 'var(--primary-fixed)',
        },
        'on-primary': 'var(--on-primary)',
        'on-primary-fixed-variant': 'var(--on-primary-fixed-variant)',
        tertiary: {
          DEFAULT: 'var(--tertiary)',
          container: 'var(--tertiary-container)',
        },
        'on-tertiary': 'var(--on-tertiary)',
        'on-tertiary-container': 'var(--on-tertiary-container)',
        'on-tertiary-fixed-variant': 'var(--on-tertiary-fixed-variant)',
        surface: {
          DEFAULT: 'var(--surface)',
          container: 'var(--surface-container)',
          'container-low': 'var(--surface-container-low)',
          'container-high': 'var(--surface-container-high)',
          'container-highest': 'var(--surface-container-highest)',
          'container-lowest': 'var(--surface-container-lowest)',
        },
        'on-surface': 'var(--on-surface)',
        'on-surface-variant': 'var(--on-surface-variant)',
        secondary: {
          DEFAULT: 'var(--secondary)',
          container: 'var(--secondary-container)',
        },
        outline: {
          DEFAULT: 'var(--outline)',
          variant: 'var(--outline-variant)',
        },
        // Legacy aliases (keep existing screens working)
        brand: {
          amber: '#F28C28',
          orange: '#F28C28',
          blue: 'var(--primary)',
          'blue-mid': 'var(--primary-container)',
          'blue-light': '#4A90C2',
          bg: 'var(--background)',
          surface: 'var(--surface-container-lowest)',
          border: 'var(--outline-variant)',
        },
        foreground: 'var(--foreground)',
        background: 'var(--background)',
        muted: 'var(--on-surface-variant)',
        privacy: '#6366F1',
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'var(--font-dm-sans)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['var(--font-jakarta)', 'var(--font-newsreader)', 'Plus Jakarta Sans', 'Georgia', 'serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
