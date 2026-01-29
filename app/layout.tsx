import type { Metadata } from "next";
import { Inter, Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSansJP = Noto_Sans_JP({ subsets: ["latin"], weight: ["300", "400", "500", "700"], variable: "--font-noto-sans" });
const notoSerifJP = Noto_Serif_JP({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-noto-serif" });

export const metadata: Metadata = {
  title: "VM's Build | 旅行手帳 APP",
  description: "Travel Planner for VM",
  manifest: "/manifest.json", // 加入這行
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className={`${inter.variable} ${notoSansJP.variable} ${notoSerifJP.variable} font-sans bg-white text-[#333333] antialiased`}>
        {children}
      </body>
    </html>
  );
}