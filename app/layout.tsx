"use client";
import { useEffect } from "react";
import { Inter, Noto_Sans_JP } from "next/font/google";
import MobileNav from "@/components/layout/MobileNav";
import { useTripStore } from "@/store/useTripStore";
import { supabase } from "@/lib/supabase";
import "./globals.css";
import { useJsApiLoader } from "@react-google-maps/api"; // 🔥 引入 Loader

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSansJP = Noto_Sans_JP({ subsets: ["latin"], weight: ["300", "400", "500", "700"], variable: "--font-noto-sans" });

// 🔥 將 Google API 需要嘅 libraries 寫喺度，統一載入
const libraries: ("places" | "marker" | "geometry")[] = ["places", "marker", "geometry"];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { loadTripsFromCloud, isSyncing, trips, activeTripId, updateTrip } = useTripStore();
  
  // 🔥 在最頂層載入 Google Maps API
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
    libraries: libraries,
  });

  useEffect(() => {
    loadTripsFromCloud();
  }, [loadTripsFromCloud]);

  // Realtime Sync
  useEffect(() => {
    const channel = supabase
      .channel('realtime-trips')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        loadTripsFromCloud();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadTripsFromCloud]);

  // 🔥 天氣 API (搬過黎呢度)
  useEffect(() => {
    const fetchAllWeather = async () => {
        const trip = activeTripId ? trips.find(t => t.id === activeTripId) : trips[0];
        if (!trip || trip.dailyItinerary.length === 0) return;

        // 一次過攞晒所有日子嘅天氣
        const startDate = trip.dailyItinerary[0].date;
        const endDate = trip.dailyItinerary[trip.dailyItinerary.length - 1].date;
        const lat = trip.dailyItinerary[0].activities.find(a=>a.lat)?.lat || 34.69;
        const lng = trip.dailyItinerary[0].activities.find(a=>a.lng)?.lng || 135.50;

        // 🔥 防呆：確保日期有效
        if(!startDate || !endDate) return;

        try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${startDate}&end_date=${endDate}`);
            const data = await res.json();

            if (data.daily) {
                const updatedItinerary = trip.dailyItinerary.map((day, index) => {
                    const temp = `${data.daily.temperature_2m_min[index]}° / ${data.daily.temperature_2m_max[index]}°`;
                    // 這裡可以根據 weather_code 轉換成 "Sun", "Cloud" 等
                    return { ...day, weather: temp };
                });
                updateTrip(trip.id, { dailyItinerary: updatedItinerary });
            }
        } catch (e) { console.error("Weather API error", e); }
    };
    // 隔一段時間先執行，避免同資料下載撞
    const timer = setTimeout(fetchAllWeather, 2000); 
    return () => clearTimeout(timer);
  }, [activeTripId, trips]);


  return (
    <html lang="zh-TW">
      <head>
        <title>VM&apos;s Build</title>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon-192.png" />
      </head>
      <body className={`${inter.variable} ${notoSansJP.variable} font-sans bg-white text-[#333333] antialiased font-light`}>
        {isSyncing && <div className="fixed top-0 left-0 right-0 h-1 bg-blue-500 z-[9999] animate-pulse" />}
        
        {/* 🔥 傳遞 isLoaded 狀態俾 Children */}
        {isLoaded ? <div className="pb-24 md:pb-0">{children}</div> : <div className="p-10 text-center animate-pulse">Loading Map Services...</div>}
        
        <MobileNav />
      </body>
    </html>
  );
}