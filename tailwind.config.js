/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        '3xl': '1600px', // Monitores grandes
        '4xl': '1920px', // Full HD grande
        'uw':  '2560px', // Ultrawide
      }
    }
  },
  plugins: [],
}
