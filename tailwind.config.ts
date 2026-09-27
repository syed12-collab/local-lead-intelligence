import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0F1417",
          900: "#161D22",
          800: "#1F292F",
          700: "#2B383F",
          600: "#3D4F58",
        },
        paper: "#F7F8F6",
        signal: {
          DEFAULT: "#2E6F5E",
          soft: "#E3EFEA",
        },
        amber: {
          DEFAULT: "#B8863B",
          soft: "#F3EAD8",
        },
        rust: {
          DEFAULT: "#B4472E",
          soft: "#F5E3DE",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "5px",
        md: "6px",
        lg: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
