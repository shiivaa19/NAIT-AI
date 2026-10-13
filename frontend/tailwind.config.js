/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        niat: {
          blue: '#1E40AF',
          navy: '#0F172A',
          cyan: '#06B6D4',
          amber: '#F59E0B',
          slate: '#334155',
          light: '#F8FAFC',
          card: '#1E293B',
          border: '#334155'
        }
      }
    },
  },
  plugins: [],
}
