/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./index.tsx",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Fredoka', 'sans-serif'],
      },
      colors: {
        background: "var(--bg)",
        sidebar: "var(--surface2)",
        card: "var(--surface)",
        surface: "var(--surface)",
        surface2: "var(--surface2)",
        default: "var(--border)",
        primary: "var(--text)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        secondary: "var(--secondary)",
        yellow: "var(--yellow)",
        purple: "var(--purple)",
        green: "var(--green)",
        "hover-bg": "var(--surface2)",
      },
      borderWidth: {
        '3': '3px',
      },
      boxShadow: {
        'brutal': '6px 6px 0px 0px var(--shadow)',
        'brutal-lg': '8px 8px 0px 0px var(--shadow)',
      }
    },
  },
  plugins: [],
};
