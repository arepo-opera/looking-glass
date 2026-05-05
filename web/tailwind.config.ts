import type { Config } from "tailwindcss";

const noRadius = {
  none: "0",
  sm: "0",
  DEFAULT: "0",
  md: "0",
  lg: "0",
  xl: "0",
  "2xl": "0",
  "3xl": "0",
  full: "0",
};

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    borderRadius: noRadius,
    extend: {
      colors: {
        charcoal: "#0a0908",
        "phosphor-bright": "#d4a574",
        "phosphor-dim": "#7a5f3f",
        "warning-red": "#c43d2a",
      },
      fontFamily: {
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
        serif: ["var(--font-im-fell)", "Times New Roman", "serif"],
      },
      letterSpacing: {
        section: "0.1em",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1.000)" },
          "50%": { transform: "scale(1.015)" },
        },
        "scroll-x": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        breathe: "breathe 4s ease-in-out infinite",
        "scroll-x": "scroll-x 60s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
