/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        binance: {
          yellow: '#F0B90B',
          lightYellow: '#F8D33A',
          black: '#0B0E11',
          black80: '#2B2F36'
        }
      },
      fontFamily: {
        // Gotham HTF como principal, con Montserrat de fallback
        sans: ['"Gotham HTF"', 'Montserrat', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
