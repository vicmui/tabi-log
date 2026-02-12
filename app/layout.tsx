"use client";
import { useEffect, useMemo } from "react";
import { Inter, Noto_Sans_JP } from "next/font/google";
import MobileNav from "@/components/layout/MobileNav";
import { useTripStore } from "@/store/useTripStore";
import { supabase } from "@/lib/supabase";
import "./globals.css";
import { useJsApiLoader, Libraries } from "@react-google-maps/api";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSansJP = Noto_Sans_JP({ subsets: ["latin"], weight: ["300", "400", "500", "700"], variable: "--font-noto-sans" });

// 🔥 必須定義在組件外部，確保參照地址永不改變
const LIBRARIES: Libraries = ["places", "marker", "geometry", "routes"];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { loadTripsFromCloud, isSyncing } = useTripStore();
  
  // 🔥 全站唯一載入點
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
    libraries: LIBRARIES,
  });

  useEffect(() => {
    loadTripsFromCloud();
  }, [loadTripsFromCloud]);

  return (
    <html lang="zh-TW">
      <head>
        <title>VM&apos;s Build</title>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon-192.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body className={`${inter.variable} ${notoSansJP.variable} font-sans bg-white text-[#333333] antialiased font-light`}>
        {isSyncing && <div className="fixed top-0 left-0 right-0 h-1 bg-blue-500 z-[9999] animate-pulse" />}
        
        {/* 只有地圖服務載入成功，才顯示內容，徹底解決不同步報錯 */}
        {isLoaded ? (
          <div className="pb-24 md:pb-0">
            {children}
          </div>
        ) : (
          <div className="p-10 text-center animate-pulse text-xs tracking-widest text-gray-400">
            {loadError ? "MAP KEY ERROR" : "INITIALIZING SERVICES..."}
          </div>
        )}
        
        <MobileNav />
      </body>
    </html>
  );
}