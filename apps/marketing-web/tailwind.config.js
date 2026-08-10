/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/index.tsx"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        serif: ["Playfair Display", "serif"],
      },
      colors: {
        zinc: {
          950: '#FDFBF7', // main warm cream background
          900: '#FFFFFF', // pure white card backgrounds
          850: '#F5F2EB', // inner container backgrounds
          800: '#EDE8E0', // soft sand borders
          700: '#DFD8CC', // hover borders
          600: '#918474', // disabled elements / borders
          500: '#857766', // placeholder text
          400: '#6E6050', // secondary descriptive text
          300: '#4D4133', // medium charcoal-brown text
          200: '#2E251B', // body text / standard headings
          100: '#1C150E', // main bold titles
        },
        violet: {
          600: '#D96B43', // primary terracotta orange action button
          500: '#E07A5F', // hover/focus states
          400: '#C2410C', // readable dark orange text highlights
          300: '#F28E6F', // lighter orange accents
          200: '#F8BBA8',
          100: '#FDF2EE', // light warm cream-orange badge fill
        },
        indigo: {
          600: '#C85A32', // burnt orange gradient end
        }
      }
    },
  },
  plugins: [],
}
