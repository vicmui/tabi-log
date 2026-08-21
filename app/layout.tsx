"use client";
import { useEffect, useState } from "react";
import { Inter, Noto_Sans_JP } from "next/font/google";
import MobileNav from "@/components/layout/MobileNav";
import AuthGate from "@/components/auth/AuthGate";
import { useTripStore } from "@/store/useTripStore";
import { supabase } from "@/lib/supabase";
import "./globals.css";
import { WifiOff } from "lucide-react";
import { useJsApiLoader, Libraries } from "@react-google-maps/api";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSansJP = Noto_Sans_JP({ subsets: ["latin"], weight: ["300", "400", "500", "700"], variable: "--font-noto-sans" });

const LIBRARIES: Libraries = ["places", "marker", "geometry", "routes"];

function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setTimeout(() => setShowBanner(false), 2000); };
    const handleOffline = () => { setIsOnline(false); setShowBanner(true); };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (!navigator.onLine) handleOffline();
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
  }, []);
  if (!showBanner) return null;
  return (
    <div className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2 text-xs font-medium tracking-wider transition-colors duration-500 ${isOnline ? "bg-green-600 text-white" : "bg-neutral-900 text-white"}`}>
      {isOnline ? "✓ 已恢復連線" : <><WifiOff size={12} /> 離線模式</>}
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { isSyncing } = useTripStore();

  // Load Google Maps globally so all components (TripMap, TravelStats, PlacesToVisit etc.) can use window.google.maps
  // Non-blocking: UI always renders, Maps loads in background
  useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
    libraries: LIBRARIES,
  });

  return (
    <html lang="zh-TW">
      <head>
        <title>Tabi Log by VM</title>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="theme-color" content="#1a1a1a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Tabi Log by VM" />
      </head>
      <body className={`${inter.variable} ${notoSansJP.variable} font-sans bg-white text-[#333333] antialiased font-light`}>
        {isSyncing && <div className="fixed top-0 left-0 right-0 h-1 bg-blue-500 z-[9999] animate-pulse" />}
        <OfflineBanner />
        {/* 未登入就只見到登入畫面（/share/... 除外） */}
        <AuthGate>
          <div className="pb-24 md:pb-0">
            {children}
          </div>
          <MobileNav />
        </AuthGate>
      </body>
    </html>
  );
}
