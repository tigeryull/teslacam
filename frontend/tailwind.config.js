/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tesla: {
          red: '#CC0000',
          dark: '#171A20',
          gray: '#3E4042',
          light: '#F4F4F4'
        }
      }
    },
  },
  plugins: [],
}
