/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",

  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],

  theme: {
    extend: {
      colors: {
        admin: {
          bg: "#08090d",
          surface: "#101218",
          card: "#14161e",
          border: "#252936",
          primary: "#6366f1",
          secondary: "#8b5cf6",
          muted: "#8b91a1"
        }
      },

      boxShadow: {
        panel: "0 12px 40px rgba(0,0,0,0.25)"
      }
    }
  },

  plugins: []
};
