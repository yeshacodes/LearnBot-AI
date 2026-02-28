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
      colors: {
        background: "var(--bg)",
        sidebar: "var(--surface)",
        card: "var(--surface)",
        surface: "var(--surface)",
        surface2: "var(--surface2)",
        default: "var(--border)",
        primary: "var(--text)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        "hover-bg": "var(--surface2)",
      },
    },
  },
  plugins: [],
};
