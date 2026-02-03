import MobileNav from "@/components/layout/MobileNav";import type { Metadata } from "next";
import { Inter } from "next/font/google"; // 假設你用 Inter，無用可以 ignore
import "./globals.css";
import MobileNav from "@/components/layout/MobileNav"; // 記得 import

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Travel App",
  description: "My awesome travel planner",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className={`${inter.variable} ${notoSansJP.variable} ${notoSerifJP.variable} font-sans bg-white text-[#333333] antialiased`}>
        {/* 主要內容區加入 pb-24 (Padding Bottom) 預留空間俾 Mobile Nav */}
        <div className="pb-24 md:pb-0"> 
          {children}
        </div>
        
        <MobileNav />
      </body>
    </html>
  );
}