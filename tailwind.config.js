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
        cream: {
          50: '#fffbf5',
          100: '#FEF3E2',
          200: '#F9E5C8',
        },
        amber: {
          gold: '#F4AE52',
          400: '#F4AE52',
        },
        rust: {
          orange: '#D4621A',
          600: '#D4621A',
        },
        espresso: {
          900: '#2A1A0E',
          950: '#1F1208',
        },
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      letterSpacing: {
        tighter: '-0.035em',
        tight: '-0.025em',
      },
    },
  },
  plugins: [],
}
