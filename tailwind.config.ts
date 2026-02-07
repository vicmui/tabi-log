import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // 將 Sans 設定為默認，並混合 Inter (英) 和 Noto Sans (日)
        sans: ["var(--font-inter)", "var(--font-noto-sans)", "sans-serif"],
        // 移除 Serif，因為 United Tokyo 風格是 Modern Sans
      },
      colors: {
        jp: {
          black: "#222222", // 稍微柔和的黑
          charcoal: "#4a4a4a", // 內文灰
          gray: "#F7F7F7", // 極淺灰背景
        }
      },
      letterSpacing: {
        // 定義 United Tokyo 特有的寬字距
        'ut-wide': '0.15em',
        'ut-widest': '0.25em',
      }
    },
  },
  plugins: [],
};
export default config;