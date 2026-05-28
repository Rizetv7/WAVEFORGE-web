/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Consolas", "monospace"],
      },
      colors: {
        forge: {
          bg: "#07090f",
          panel: "#10141d",
          panel2: "#151b27",
          line: "#263143",
          cyan: "#38f6ff",
          blue: "#5e83ff",
          violet: "#a36bff",
          orange: "#ffad55",
          green: "#65ffb0",
        },
      },
      boxShadow: {
        glow: "0 0 28px rgba(56, 246, 255, 0.18)",
        panel: "0 18px 54px rgba(0, 0, 0, 0.42)",
      },
    },
  },
  plugins: [],
};
