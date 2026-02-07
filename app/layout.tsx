"use client";
import { useEffect } from "react";
import { Inter, Noto_Sans_JP } from "next/font/google"; // 移除 Noto_Serif_JP
import MobileNav from "@/components/layout/MobileNav";
import { useTripStore } from "@/store/useTripStore";
import "./globals.css";

// 1. 英文數字用 Inter (幾何感)
const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter",
  display: "swap",
});

// 2. 日文/中文用 Noto Sans JP (黑體)，重點係引入 '300' (Light)
const notoSansJP = Noto_Sans_JP({ 
  subsets: ["latin"], 
  weight: ["300", "400", "500", "700"], // 包含幼體
  variable: "--font-noto-sans",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { loadTripsFromCloud, isSyncing } = useTripStore();

  useEffect(() => {
    if (loadTripsFromCloud) {
        loadTripsFromCloud();
    }
  }, [loadTripsFromCloud]);

  return (
    <html lang="zh-TW">
      <head>
        <title>VM&apos;s Build</title>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon-192.png" />
      </head>
      {/* 🔥 改用 font-sans，並預設 text-light (幼字) */}
      <body className={`${inter.variable} ${notoSansJP.variable} font-sans bg-white text-[#333333] antialiased font-light`}>
        {isSyncing && (
           <div className="fixed top-0 left-0 right-0 h-0.5 bg-gray-800 z-[9999] animate-pulse" />
        )}
        <div className="pb-24 md:pb-0">
          {children}
        </div>
        <MobileNav />
      </body>
    </html>
  );
}