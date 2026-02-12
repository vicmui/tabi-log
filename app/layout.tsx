"use client";
import { useEffect } from "react";
import { Inter, Noto_Sans_JP } from "next/font/google";
import MobileNav from "@/components/layout/MobileNav";
import { useTripStore } from "@/store/useTripStore";
import { supabase } from "@/lib/supabase";
import "./globals.css";
import { useJsApiLoader, Libraries } from "@react-google-maps/api";
import { differenceInDays, parseISO } from 'date-fns';

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSansJP = Noto_Sans_JP({ subsets: ["latin"], weight: ["300", "400", "500", "700"], variable: "--font-noto-sans" });

// 🔥 關鍵修正：定義在外面，確保參照地址一致
const LIBRARIES: Libraries = ["places", "marker", "geometry", "routes"];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { loadTripsFromCloud, isSyncing, trips, activeTripId, updateTrip } = useTripStore();
  
  // 🔥 修正：移除了 language 設定，避免與預設衝突
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
    libraries: LIBRARIES,
  });

  useEffect(() => { loadTripsFromCloud(); }, [loadTripsFromCloud]);

  useEffect(() => {
    const channel = supabase.channel('realtime-trips').on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => { loadTripsFromCloud(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadTripsFromCloud]);

  useEffect(() => {
    const fetchAllWeather = async () => {
        const trip = activeTripId ? trips.find(t => t.id === activeTripId) : trips[0];
        if (!trip || trip.dailyItinerary.length === 0) return;
        const today = new Date();
        const startDate = trip.dailyItinerary[0].date;
        const endDate = trip.dailyItinerary[trip.dailyItinerary.length - 1].date;
        const daysUntilTrip = differenceInDays(parseISO(startDate), today);
        if (daysUntilTrip > 15 || daysUntilTrip < -7) return;

        const lat = trip.dailyItinerary[0].activities.find(a=>a.lat)?.lat || 34.69;
        const lng = trip.dailyItinerary[0].activities.find(a=>a.lng)?.lng || 135.50;
        if(!startDate || !endDate) return;

        try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${startDate}&end_date=${endDate}`);
            if(!res.ok) return;
            const data = await res.json();
            if (data.daily && data.daily.time) {
                const updatedItinerary = trip.dailyItinerary.map((day) => {
                    const idx = data.daily.time.indexOf(day.date);
                    if (idx > -1) {
                        return { ...day, weather: `${Math.round(data.daily.temperature_2m_min[idx])}°/${Math.round(data.daily.temperature_2m_max[idx])}°` };
                    }
                    return day;
                });
                updateTrip(trip.id, { dailyItinerary: updatedItinerary });
            }
        } catch (e) { console.error(e); }
    };
    const timer = setTimeout(fetchAllWeather, 2000); 
    return () => clearTimeout(timer);
  }, [activeTripId, trips, updateTrip]);

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
        {loadError && <div className="p-4 text-center bg-red-500 text-white text-xs">Map Error: Check API Key</div>}
        
        {/* 確保地圖載入後才顯示內容，防止閃爍 */}
        {isLoaded ? <div className="pb-24 md:pb-0">{children}</div> : <div className="p-10 text-center animate-pulse text-xs tracking-widest text-gray-400">LOADING...</div>}
        
        <MobileNav />
      </body>
    </html>
  );
}