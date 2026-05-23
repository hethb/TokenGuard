/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0f1115",
        panel: "#161a21",
        muted: "#9aa3b2",
        accent: "#4f7cff",
        ok: "#6ee7a3",
        warn: "#facc15",
        bad: "#fda4a4"
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      }
    }
  },
  plugins: []
};
