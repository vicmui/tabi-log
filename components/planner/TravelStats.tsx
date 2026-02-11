"use client";
import { useState, useEffect } from "react";
import { Car, Footprints, TrainFront, MoreHorizontal, Loader2 } from "lucide-react";
import clsx from "clsx";

interface Props {
  origin: { lat: number; lng: number };
  dest: { lat: number; lng: number };
}

type TravelMode = "WALKING" | "TRANSIT" | "DRIVING";
const MODE_CONFIG: Record<TravelMode, { icon: any }> = { WALKING: { icon: Footprints }, TRANSIT: { icon: TrainFront }, DRIVING: { icon: Car } };

export default function TravelStats({ origin, dest }: Props) {
  const [stats, setStats] = useState<{ duration: string; distance: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<TravelMode>("WALKING");

  useEffect(() => {
    // 🔥 確保 google maps script 已載入
    if (!window.google || !window.google.maps) return;
    if (!origin || !dest || !origin.lat || !dest.lat) { setLoading(false); return; }
    
    setLoading(true);
    const service = new google.maps.DistanceMatrixService();
    
    service.getDistanceMatrix(
      {
        origins: [{ lat: origin.lat, lng: origin.lng }],
        destinations: [{ lat: dest.lat, lng: dest.lng }],
        travelMode: mode as google.maps.TravelMode,
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (response, status) => {
        if (status === 'OK' && response?.rows[0]?.elements[0]?.status === 'OK') {
          const element = response.rows[0].elements[0];
          setStats({ duration: element.duration.text, distance: element.distance.text });
        } else {
          setStats(null);
        }
        setLoading(false);
      }
    );
  }, [origin, dest, mode]);

  return (
    <div className="relative pl-10 py-2">
       <div className="absolute left-[28px] top-0 bottom-0 w-[2px] bg-gray-200"></div>
       <div className="relative z-10 flex items-center gap-2">
           <div className="flex bg-gray-100 border border-gray-200 rounded-full p-0.5 shadow-sm">
               {(["WALKING", "TRANSIT", "DRIVING"] as TravelMode[]).map(m => {
                   const Icon = MODE_CONFIG[m].icon;
                   return (<button key={m} onClick={() => setMode(m)} className={clsx("p-1.5 rounded-full transition-colors", mode === m ? "bg-black text-white shadow" : "text-gray-400 hover:bg-gray-200")} title={m}><Icon size={12} /></button>);
               })}
           </div>
           <div className="text-[10px] text-gray-500 font-medium">
                {loading ? (<div className="flex items-center gap-1 text-gray-300 animate-pulse"><Loader2 size={10} className="animate-spin"/> 計算中...</div>) : stats ? (<div className="flex items-center gap-2"><span>{stats.duration}</span><span className="text-gray-300">•</span><span>{stats.distance}</span></div>) : (<span className="text-gray-300">無法計算</span>)}
           </div>
       </div>
    </div>
  );
}