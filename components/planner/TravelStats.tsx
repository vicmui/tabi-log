"use client";
import { useState, useEffect } from "react";
import { TrainFront } from "lucide-react";

interface Props {
  origin: { lat: number; lng: number };
  dest: { lat: number; lng: number };
}

export default function TravelStats({ origin, dest }: Props) {
  const [stats, setStats] = useState<{ duration: string; distance: string } | null>(null);

  useEffect(() => {
    if (!origin || !dest || !google || !google.maps) return;
    
    const service = new google.maps.DistanceMatrixService();
    
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
            distance: element.distance.text
          });
        }
      }
    );
  }, [origin, dest]);

  if (!stats) return <div className="pl-10 py-1 flex items-center relative"><div className="absolute left-[28px] top-0 bottom-0 w-[2px] bg-gray-200"></div></div>;

  return (
    <div className="relative pl-10 py-2">
       <div className="absolute left-[28px] top-0 bottom-0 w-[2px] bg-gray-200"></div>
       <div className="relative z-10 flex items-center">
           <div className="bg-gray-100 border border-gray-200 rounded-full px-3 py-1 flex items-center gap-2 text-[10px] text-gray-500 font-medium shadow-sm">
               <TrainFront size={12}/>
               <span>{stats.duration}</span>
               <span className="text-gray-300">•</span>
               <span>{stats.distance}</span>
           </div>
       </div>
    </div>
  );
}