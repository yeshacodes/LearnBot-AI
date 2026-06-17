/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./index.tsx",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Inter', 'Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
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
        'brutal': '0 1px 2px 0 var(--shadow)',
        'brutal-lg': '0 10px 30px -24px var(--shadow)',
      }
    },
  },
  plugins: [],
};
