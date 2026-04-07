/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        editor: ["Georgia", "Cambria", "Times New Roman", "Times", "serif"],
        mono: ["SF Mono", "Fira Code", "Fira Mono", "Roboto Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
