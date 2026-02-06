import type { Config } from "tailwindcss";

const config: Config = {
  // 🔥 重點：這裡告訴 Tailwind 去掃描所有可能的資料夾
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // 以防萬一你有 src
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-noto-sans)", "sans-serif"],
        serif: ["var(--font-noto-serif)", "serif"],
      },
      colors: {
        jp: {
          black: "#333333", // 深灰字
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