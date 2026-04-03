/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#D4AF37',
          dark: '#C5A028',
        },
        ivory: '#FCFBF7',
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'serif'],
        handwriting: ['Birthstone', 'cursive'],
        sans: ['Montserrat', 'sans-serif'],
      },
      backgroundImage: {
        'luxury-bg': "url('/static/hero.png')",
      }
    },
  },
  plugins: [],
}
