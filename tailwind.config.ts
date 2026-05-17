import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fondos
        void:    "#06050F",
        surface: "#0D0B1A",
        overlay: "#15122A",
        border:  "#1E1A35",

        // Neons
        neon: {
          purple: "#B44FFF",
          blue:   "#4FC3FF",
          pink:   "#FF4FA8",
          green:  "#4FFFB4",
        },

        // Raridades
        rarity: {
          common:                   "#9CA3AF",
          uncommon:                 "#34D399",
          rare:                     "#60A5FA",
          "double-rare":            "#A78BFA",
          "ultra-rare":             "#F59E0B",
          "illustration-rare":      "#FB923C",
          "special-illustration":   "#EC4899",
          "hyper-rare":             "#B44FFF",
          "secret-rare":            "#EF4444",
        },
      },

      fontFamily: {
        display: ["Rajdhani", "sans-serif"],
        body:    ["DM Sans", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
      },

      boxShadow: {
        "neon-purple": "0 0 20px #B44FFF80, 0 0 40px #B44FFF40",
        "neon-blue":   "0 0 20px #4FC3FF80, 0 0 40px #4FC3FF40",
        "neon-pink":   "0 0 20px #FF4FA880, 0 0 40px #FF4FA840",
        "neon-green":  "0 0 20px #4FFFB480, 0 0 40px #4FFFB440",
        "card-glow":   "0 0 30px var(--card-glow), 0 0 60px var(--card-glow-far)",
      },

      backgroundImage: {
        "gradient-neon": "linear-gradient(135deg, #B44FFF, #4FC3FF)",
        "gradient-pink": "linear-gradient(135deg, #FF4FA8, #B44FFF)",
      },

      animation: {
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "float":      "float 3s ease-in-out infinite",
        "shimmer":    "shimmer 1.5s infinite",
      },

      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.6" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-6px)" },
        },
        shimmer: {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
    },
  },
  plugins: [forms],
};

export default config;
