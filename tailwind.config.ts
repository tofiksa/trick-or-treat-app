import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Halloween Theme Colors
        "orange-primary": "#ff7518",
        "orange-secondary": "#ff9500",
        "orange-light": "#ffb84d",
        "purple-primary": "#6b2c91",
        "purple-secondary": "#8b3db8",
        "purple-light": "#a855f7",
        "black-primary": "#0a0a0a",
        "black-secondary": "#1a0d1a",
        background: "#1a0d1a",
        foreground: "#ff7518",
      },
    },
  },
  plugins: [],
};
export default config;

