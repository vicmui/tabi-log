import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // 防止你用左 src 目錄
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        serif: ["var(--font-noto-serif)", "serif"],
      },
      colors: {
        jp: {
          black: "#333333",
          charcoal: "#333333",
          gray: "#F0F0F0",
          accent: "#000000",
        }
      },
    },
  },
  plugins: [],
};
export default config;