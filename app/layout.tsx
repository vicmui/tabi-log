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
          <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
            <div className="relative flex flex-col items-center gap-8">
              {/* Animated plane */}
              <div className="relative w-64 h-16 flex items-center">
                {/* Runway / dotted trail */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex gap-2 items-center">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="h-px flex-1 bg-gray-200"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                {/* Plane emoji flying across */}
                <div
                  className="absolute text-2xl"
                  style={{
                    animation: "flyAcross 2s ease-in-out infinite",
                  }}
                >
                  ✈️
                </div>
              </div>

              {/* Text */}
              <div className="text-center">
                <p className="text-[9px] tracking-[0.35em] text-gray-400 uppercase">
                  {loadError ? "地圖服務載入失敗" : "正在起飛中..."}
                </p>
              </div>
            </div>

            {/* Inline keyframes */}
            <style>{`
              @keyframes flyAcross {
                0%   { left: -8px;  opacity: 0; transform: translateY(4px); }
                15%  { opacity: 1; }
                85%  { opacity: 1; }
                100% { left: calc(100% - 8px); opacity: 0; transform: translateY(-4px); }
              }
            `}</style>
          </div>
        )}
        
        <MobileNav />
      </body>
    </html>
  );
}