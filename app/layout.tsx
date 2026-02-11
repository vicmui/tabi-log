"use client";
import { useEffect } from "react";
import { Inter, Noto_Sans_JP } from "next/font/google";
import MobileNav from "@/components/layout/MobileNav";
import { useTripStore } from "@/store/useTripStore";
import { supabase } from "@/lib/supabase";
import "./globals.css";
import { useJsApiLoader } from "@react-google-maps/api";
import { differenceInDays, parseISO } from 'date-fns'; // 引入日期計算工具

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSansJP = Noto_Sans_JP({ subsets: ["latin"], weight: ["300", "400", "500", "700"], variable: "--font-noto-sans" });

const libraries: ("places" | "marker" | "geometry")[] = ["places", "marker", "geometry"];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { loadTripsFromCloud, isSyncing, trips, activeTripId, updateTrip } = useTripStore();
  
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

  // 🔥 天氣 API (防呆版)
  useEffect(() => {
    const fetchAllWeather = async () => {
        const trip = activeTripId ? trips.find(t => t.id === activeTripId) : trips[0];
        if (!trip || trip.dailyItinerary.length === 0) return;

        const today = new Date();
        const startDate = trip.dailyItinerary[0].date;
        const endDate = trip.dailyItinerary[trip.dailyItinerary.length - 1].date;
        
        // 🔥 檢查行程是否在 16 日內
        const daysUntilTrip = differenceInDays(parseISO(startDate), today);
        if (daysUntilTrip > 15 || daysUntilTrip < 0) {
            console.log("行程不在天氣預測範圍內，使用預設天氣。");
            return; // 超過範圍，唔 Call API
        }

        const lat = trip.dailyItinerary[0].activities.find(a=>a.lat)?.lat || 34.69;
        const lng = trip.dailyItinerary[0].activities.find(a=>a.lng)?.lng || 135.50;

        if(!startDate || !endDate) return;

        try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${startDate}&end_date=${endDate}`);
            const data = await res.json();

            if (data.daily && data.daily.time) {
                const newWeatherMap: Record<string, string> = {}; // 只存溫度
                data.daily.time.forEach((dateStr: string, index: number) => {
                    newWeatherMap[dateStr] = `${Math.round(data.daily.temperature_2m_min[index])}°/${Math.round(data.daily.temperature_2m_max[index])}°`;
                });

                // 更新 Store
                const updatedItinerary = trip.dailyItinerary.map(day => ({
                    ...day,
                    weather: newWeatherMap[day.date] || "15°/25°" // 如果 API 冇返，用預設
                }));
                updateTrip(trip.id, { dailyItinerary: updatedItinerary });
            }
        } catch (e) { console.error("Weather API error", e); }
    };
    
    // 隔 2 秒執行，確保 trip 資料已載入
    const timer = setTimeout(fetchAllWeather, 2000); 
    return () => clearTimeout(timer);
  }, [activeTripId, trips, updateTrip]);


  return (
    <html lang="zh-TW">
      <head>
        <title>VM&apos;s Build</title>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon-192.png" />
      </head>
      <body className={`${inter.variable} ${notoSansJP.variable} font-sans bg-white text-[#333333] antialiased font-light`}>
        {isSyncing && <div className="fixed top-0 left-0 right-0 h-1 bg-blue-500 z-[9999] animate-pulse" />}
        
        {isLoaded ? <div className="pb-24 md:pb-0">{children}</div> : <div className="p-10 text-center animate-pulse">Loading Map Services...</div>}
        
        <MobileNav />
      </body>
    </html>
  );
}