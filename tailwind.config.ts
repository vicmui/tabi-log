import type { Config } from "tailwindcss";

const config: Config = {
  // 🔥 重點在這裡：我加了 "./src/**/*.{...}" 以防萬一
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // 加多這一行保命
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-noto-sans)", "sans-serif"],
        serif: ["var(--font-noto-serif)", "serif"],
      },
      colors: {
        jp: {
          black: "#111111",
          charcoal: "#333333",
          gray: "#F0F0F0",
          accent: "#000000",
        }
      },
      borderRadius: {
        'none': '0',
      }
    },
  },
  plugins: [],
};
export default config;