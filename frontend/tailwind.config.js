/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: '#e5642b',
        },
        accentSoft: 'var(--color-accent-soft)',
        ink: {
          DEFAULT: 'var(--color-ink)',
          secondary: 'var(--color-text-secondary)',
        },
        surface: 'var(--color-surface)',
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
