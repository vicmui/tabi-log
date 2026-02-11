"use client";
import { useState, useEffect } from "react";
import { useJsApiLoader } from '@react-google-maps/api';
import { Car, Footprints, TrainFront, MoreHorizontal } from "lucide-react";

interface Props {
  origin: { lat: number; lng: number };
  dest: { lat: number; lng: number };
}

export default function TravelStats({ origin, dest }: Props) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""
  });

  const [stats, setStats] = useState<{ duration: string; distance: string } | null>(null);

  useEffect(() => {
    if (!isLoaded || !origin || !dest) return;

    // 防止重複請求 (簡單防護)
    const service = new google.maps.DistanceMatrixService();
    
    service.getDistanceMatrix(
      {
        origins: [{ lat: origin.lat, lng: origin.lng }],
        destinations: [{ lat: dest.lat, lng: dest.lng }],
        travelMode: google.maps.TravelMode.TRANSIT, // 預設用公共交通
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (response, status) => {
        if (status === 'OK' && response?.rows[0]?.elements[0]?.status === 'OK') {
          const element = response.rows[0].elements[0];
          setStats({
            duration: element.duration.text,
            distance: element.distance.text
          });
        }
      }
    );
  }, [isLoaded, origin, dest]);

  if (!stats) return (
      <div className="pl-8 py-2 flex items-center gap-2 opacity-30">
          <div className="h-4 w-[2px] bg-gray-300 mx-auto"></div>
      </div>
  );

  return (
    <div className="flex items-center gap-3 pl-12 py-2 text-[10px] text-gray-400 font-mono tracking-wider">
       <div className="flex flex-col items-center gap-1 opacity-30">
           <div className="w-[2px] h-2 bg-gray-400"></div>
           <TrainFront size={12} />
           <div className="w-[2px] h-2 bg-gray-400"></div>
       </div>
       <div className="bg-gray-50 px-2 py-1 rounded border border-gray-100 flex items-center gap-2">
          <span>{stats.duration}</span>
          <span className="text-gray-300">|</span>
          <span>{stats.distance}</span>
       </div>
    </div>
  );
}