import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        gold: { DEFAULT: "#C9A227", deep: "#A6841C", soft: "#E6C75A" },
        ink: { DEFAULT: "#0E0E0E", 700: "#1C1C1C" },
        sand: { DEFAULT: "#E8DCC0", soft: "#F5EFE2" },
        nile: { DEFAULT: "#1B4965", bright: "#1E6091" },
        success: "#2E7D32",
        warning: "#ED6C02",
        danger: "#C62828",
        // semantic tokens (mapped to CSS vars for light/dark)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        border: "hsl(var(--border))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 6px)",
      },
      fontFamily: {
        sans: ["var(--font-arabic)", "var(--font-latin)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-arabic)", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
