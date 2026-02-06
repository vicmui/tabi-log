"use client";
import { useEffect } from "react";
import { Inter, Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import MobileNav from "@/components/layout/MobileNav";
import { useTripStore } from "@/store/useTripStore";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSansJP = Noto_Sans_JP({ subsets: ["latin"], weight: ["300", "400", "500", "700"], variable: "--font-noto-sans" });
const notoSerifJP = Noto_Serif_JP({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-noto-serif" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // 🔥 改用 selector 寫法，防止 Store 未準備好時 Crash
  const loadTripsFromCloud = useTripStore((state) => state.loadTripsFromCloud);
  const isSyncing = useTripStore((state) => state.isSyncing);

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
      <body className={`${inter.variable} ${notoSansJP.variable} ${notoSerifJP.variable} font-sans bg-white text-[#333333] antialiased`}>
        {/* 同步指示燈 */}
        {isSyncing && (
           <div className="fixed top-0 left-0 right-0 h-1 bg-blue-500 z-[9999] animate-pulse" />
        )}
        
        <div className="pb-24 md:pb-0">
          {children}
        </div>
        <MobileNav />
      </body>
    </html>
  );
}