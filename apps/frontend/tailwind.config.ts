import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf2f2",
          100: "#fce4e4",
          200: "#fbcdcd",
          300: "#f7a8a8",
          400: "#f07575",
          500: "#e54848",
          600: "#d12a2a",
          700: "#881c1c",
          800: "#731a1a",
          900: "#611c1c",
          950: "#350a0a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
