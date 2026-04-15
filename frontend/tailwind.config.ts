import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 24px rgba(56, 189, 248, 0.35)",
      },
      backgroundImage: {
        "neon-radial":
          "radial-gradient(circle at 20% 20%, rgba(34,211,238,0.22), transparent 55%), radial-gradient(circle at 80% 30%, rgba(168,85,247,0.18), transparent 50%), radial-gradient(circle at 50% 85%, rgba(244,63,94,0.15), transparent 55%)",
      },
    },
  },
  plugins: [],
} satisfies Config;

