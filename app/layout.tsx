"use client";
import { useEffect } from "react";
import { Inter, Noto_Sans_JP } from "next/font/google";
import MobileNav from "@/components/layout/MobileNav";
import { useTripStore } from "@/store/useTripStore";
import { supabase } from "@/lib/supabase"; // 引入 Supabase
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSansJP = Noto_Sans_JP({ subsets: ["latin"], weight: ["300", "400", "500", "700"], variable: "--font-noto-sans" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { loadTripsFromCloud, isSyncing, trips } = useTripStore();

  // 1. APP 啟動時下載最新資料
  useEffect(() => {
    loadTripsFromCloud();
  }, []);

  // 2. 🔥 開啟 Real-time 監聽 (當雲端資料變更，自動更新本地)
  useEffect(() => {
    const channel = supabase
      .channel('realtime-trips')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        console.log("🔔 雲端資料有變更，正在同步...");
        loadTripsFromCloud(); // 重新下載最新資料
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <html lang="zh-TW">
// 在 app/layout.tsx 裡面，找到 <head> 部分
<head>
  <title>VM&apos;s Build</title>
  <link rel="manifest" href="/manifest.json" />
  <link rel="icon" href="/icon-192.png" />
  <meta name="theme-color" content="#ffffff" />
  
  {/* 🔥 修改：新版寫法，兼容性更好 */}
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" /> 
</head>
      <body className={`${inter.variable} ${notoSansJP.variable} font-sans bg-white text-[#333333] antialiased font-light`}>
        {/* 同步指示條 (上方藍色條) */}
        {isSyncing && <div className="fixed top-0 left-0 right-0 h-1 bg-blue-500 z-[9999] animate-pulse" />}
        
        <div className="pb-24 md:pb-0">
          {children}
        </div>
        <MobileNav />
      </body>
    </html>
  );
}