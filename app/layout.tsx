import type { Metadata } from "next";
import { Inter, Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import MobileNav from "@/components/layout/MobileNav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSansJP = Noto_Sans_JP({ subsets: ["latin"], weight: ["300", "400", "500", "700"], variable: "--font-noto-sans" });
const notoSerifJP = Noto_Serif_JP({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-noto-serif" });

export const metadata: Metadata = {
  // 🔥 改名：
  title: "Osaka Trip (March)",
  description: "VM's Travel Architect",
  manifest: "/manifest.json",
  icons: {
    icon: '/icon-192.png', // 指向你的圖片
    apple: '/icon-192.png',
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className={`${inter.variable} ${notoSansJP.variable} ${notoSerifJP.variable} font-sans bg-white text-[#333333] antialiased`}>
        <MobileNav />
        {children}
      </body>
    </html>
  );
}