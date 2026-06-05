
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // wrap the font name in quotes and provide a sensible fallback
        gerbil: ['"Gerbil"', 'cursive', 'sans-serif'],
        satoshi:['satoshi', 'cursive', 'sans-serif']
      },
    },
  },
  plugins: [],
}