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
        pantanal: {
          50: '#f4f6f0',
          100: '#e5ebd9',
          200: '#cbd8b5',
          300: '#a7be88',
          400: '#84a25f',
          500: '#648542',
          600: '#4d6833',
          700: '#3b4c2b', // Official Pantanal Green from Brand Guide
          800: '#2d3a22',
          900: '#222d1a',
          950: '#11170d',
        },
        ouro: {
          300: '#ebd196',
          400: '#dfb56c',
          500: '#c59b4c', // Official Gold from Brand Guide
          600: '#a87e35',
          700: '#835f25',
        },
        couro: {
          400: '#8a5231',
          500: '#6d3f23',
          600: '#54301b', // Official Leather from Brand Guide
          700: '#3d2112',
          800: '#2c160b',
          900: '#1f0f07',
          950: '#140904',
        },
        carvao: {
          800: '#262626',
          900: '#1a1a1a', // Official Charcoal
          950: '#121212',
        },
        pergaminho: '#f0e6d6',
      }
    },
  },
  plugins: [],
}
