/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forge: { DEFAULT: '#f59e0b', dark: '#b45309' },
      },
    },
  },
  plugins: [],
}
