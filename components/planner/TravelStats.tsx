"use client";
import { useState, useEffect } from "react";
import { useJsApiLoader } from '@react-google-maps/api';
import { Car, Footprints, TrainFront, MoreHorizontal, Loader2 } from "lucide-react";

interface Props {
  origin: { lat: number; lng: number };
  dest: { lat: number; lng: number };
}

export default function TravelStats({ origin, dest }: Props) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""
  });

  const [stats, setStats] = useState<{ duration: string; distance: string; mode: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !origin || !dest) return;
    
    // 簡單檢查座標是否有效
    if(!origin.lat || !origin.lng || !dest.lat || !dest.lng) {
        setLoading(false);
        return;
    }

    const service = new google.maps.DistanceMatrixService();
    
    // 預設計算 "TRANSIT" (公共交通)，如果失敗或太近可以用 "WALKING"
    service.getDistanceMatrix(
      {
        origins: [{ lat: origin.lat, lng: origin.lng }],
        destinations: [{ lat: dest.lat, lng: dest.lng }],
        travelMode: google.maps.TravelMode.TRANSIT, 
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (response, status) => {
        if (status === 'OK' && response?.rows[0]?.elements[0]?.status === 'OK') {
          const element = response.rows[0].elements[0];
          setStats({
            duration: element.duration.text.replace(' hours', 'h').replace(' mins', 'm'),
            distance: element.distance.text,
            mode: 'TRANSIT'
          });
        } else {
            // 如果 TRANSIT 失敗 (例如太近)，試試 WALKING
            service.getDistanceMatrix({
                origins: [{ lat: origin.lat, lng: origin.lng }],
                destinations: [{ lat: dest.lat, lng: dest.lng }],
                travelMode: google.maps.TravelMode.WALKING,
                unitSystem: google.maps.UnitSystem.METRIC,
            }, (res2, status2) => {
                if (status2 === 'OK' && res2?.rows[0]?.elements[0]?.status === 'OK') {
                    const el = res2.rows[0].elements[0];
                    setStats({
                        duration: el.duration.text,
                        distance: el.distance.text,
                        mode: 'WALKING'
                    });
                }
            });
        }
        setLoading(false);
      }
    );
  }, [isLoaded, origin, dest]);

  if (loading) return (
      <div className="pl-10 py-1 flex items-center">
          <div className="w-[2px] h-6 bg-gray-200 mx-auto animate-pulse"></div>
      </div>
  );

  if (!stats) return (
      <div className="pl-10 py-1 flex items-center relative">
          <div className="absolute left-[28px] top-0 bottom-0 w-[2px] bg-gray-200"></div>
      </div>
  );

  return (
    <div className="relative pl-10 py-2">
       {/* 連接線 */}
       <div className="absolute left-[28px] top-0 bottom-0 w-[2px] bg-gray-200"></div>
       
       {/* 交通資訊膠囊 */}
       <div className="relative z-10 flex items-center">
           <div className="bg-gray-100 border border-gray-200 rounded-full px-3 py-1 flex items-center gap-2 text-[10px] text-gray-500 font-medium shadow-sm">
               {stats.mode === 'WALKING' ? <Footprints size={12}/> : <TrainFront size={12}/>}
               <span>{stats.duration}</span>
               <span className="text-gray-300">•</span>
               <span>{stats.distance}</span>
           </div>
       </div>
    </div>
  );
}