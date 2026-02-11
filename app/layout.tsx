"use client";
import { useEffect } from "react";
import { Inter, Noto_Sans_JP } from "next/font/google";
import MobileNav from "@/components/layout/MobileNav";
import { useTripStore } from "@/store/useTripStore";
import { supabase } from "@/lib/supabase";
import "./globals.css";
import { useJsApiLoader } from "@react-google-maps/api";
import { differenceInDays, parseISO } from 'date-fns';

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSansJP = Noto_Sans_JP({ subsets: ["latin"], weight: ["300", "400", "500", "700"], variable: "--font-noto-sans" });

const libraries: ("places" | "marker" | "geometry" | "routes")[] = ["places", "marker", "geometry", "routes"];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { loadTripsFromCloud, isSyncing, trips, activeTripId, updateTrip } = useTripStore();
  
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
    libraries: libraries,
  });

  useEffect(() => { loadTripsFromCloud(); }, [loadTripsFromCloud]);

  useEffect(() => {
    const channel = supabase.channel('realtime-trips').on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => { loadTripsFromCloud(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadTripsFromCloud]);

  // 天氣 API 邏輯 (省略細節以保簡潔)
  useEffect(() => {
    /* ... 保持之前的天氣代碼 ... */
  }, [activeTripId, trips, updateTrip]);

  return (
    <html lang="zh-TW">
      <head>
        <title>VM&apos;s Build</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon-192.png" />
        
        {/* iOS PWA 支援 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="VM's Build" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        
        {/* Android 主題顏色 */}
        <meta name="theme-color" content="#ffffff" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} ${notoSansJP.variable} font-sans bg-white text-[#333333] antialiased font-light`}>
        {isSyncing && <div className="fixed top-0 left-0 right-0 h-1 bg-blue-500 z-[9999] animate-pulse" />}
        {loadError && <div className="p-4 text-center bg-red-500 text-white text-xs">Map Loading Error.</div>}
        
        {isLoaded ? (
            <div className="pb-24 md:pb-0 min-h-screen flex flex-col">
                {children}
            </div>
        ) : (
            <div className="p-10 text-center animate-pulse text-xs tracking-widest text-gray-400">LOADING MAP SERVICES...</div>
        )}
        
        <MobileNav />
      </body>
    </html>
  );
}