"use client";
import { useState, useEffect } from "react";
import { useJsApiLoader } from '@react-google-maps/api';
import { Car, Footprints, TrainFront, MoreHorizontal, Loader2 } from "lucide-react";
import clsx from "clsx";

interface Props {
  origin: { lat: number; lng: number };
  dest: { lat: number; lng: number };
}

type TravelMode = "WALKING" | "TRANSIT" | "DRIVING";

const MODE_CONFIG: Record<TravelMode, { icon: any }> = {
    WALKING: { icon: Footprints },
    TRANSIT: { icon: TrainFront },
    DRIVING: { icon: Car }
};

export default function TravelStats({ origin, dest }: Props) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""
  });

  const [stats, setStats] = useState<{ duration: string; distance: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<TravelMode>("WALKING"); // 預設行路

  useEffect(() => {
    if (!isLoaded || !origin || !dest || !origin.lat || !dest.lat) {
      setLoading(false);
      return;
    }

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
          setStats({
            duration: element.duration.text.replace(' hours', 'h').replace(' mins', 'm'),
            distance: element.distance.text,
          });
        } else {
          setStats(null); // 如果攞唔到資料，就清空
        }
        setLoading(false);

        // Debug
        console.log(`DistanceMatrix (${mode}) status:`, status, response);
      }
    );
  }, [isLoaded, origin, dest, mode]); // 🔥 當 mode 改變，重新計一次

  return (
    <div className="relative pl-10 py-2">
       {/* 連接線 */}
       <div className="absolute left-[28px] top-0 bottom-0 w-[2px] bg-gray-200"></div>
       
       <div className="relative z-10 flex items-center gap-2">
           {/* 模式切換按鈕 */}
           <div className="flex bg-gray-100 border border-gray-200 rounded-full p-0.5 shadow-sm">
               {(["WALKING", "TRANSIT", "DRIVING"] as TravelMode[]).map(m => {
                   const Icon = MODE_CONFIG[m].icon;
                   return (
                       <button 
                           key={m} 
                           onClick={() => setMode(m)}
                           className={clsx(
                               "p-1.5 rounded-full transition-colors",
                               mode === m ? "bg-black text-white shadow" : "text-gray-400 hover:bg-gray-200"
                           )}
                           title={m}
                       >
                          <Icon size={12} />
                       </button>
                   );
               })}
           </div>
           
           {/* 交通資訊 */}
           <div className="text-[10px] text-gray-500 font-medium">
                {loading ? (
                    <div className="flex items-center gap-1 text-gray-300 animate-pulse"><Loader2 size={10} className="animate-spin"/> 計算中...</div>
                ) : stats ? (
                    <div className="flex items-center gap-2">
                        <span>{stats.duration}</span>
                        <span className="text-gray-300">•</span>
                        <span>{stats.distance}</span>
                    </div>
                ) : (
                    <span className="text-gray-300">無法計算</span>
                )}
           </div>
       </div>
    </div>
  );
}