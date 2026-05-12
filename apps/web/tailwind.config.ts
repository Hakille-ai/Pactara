import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        paper: "#f6f3ed",
        signal: "#0f766e",
        ember: "#b45309",
        violet: "#6d28d9",
      },
      boxShadow: {
        panel: "0 20px 60px rgba(17, 24, 39, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;

