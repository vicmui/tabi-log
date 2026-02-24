"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Trip, useTripStore } from "@/store/useTripStore";

export default function TripCard({ trip }: { trip: Trip }) {
  const router = useRouter();
  const setActiveTrip = useTripStore((state) => state.setActiveTrip);

  const handleClick = () => {
    setActiveTrip(trip.id);
    router.push(`/planner/${trip.id}`); 
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group cursor-pointer flex flex-col gap-4"
      onClick={handleClick}
    >
      {/* 1. 圖片區域 */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100">
        {trip.coverImage ? (
          <Image 
            src={trip.coverImage} 
            alt={trip.title}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-200 via-neutral-300 to-neutral-400" />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
      </div>

      {/* 2. 文字區域 */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-baseline">
           <h3 className="text-sm font-bold tracking-widest text-black group-hover:underline decoration-1 underline-offset-4">
             {trip.title}
           </h3>
           <span className="text-xs font-mono text-gray-400">40%</span>
        </div>
        
        <p className="text-[11px] text-gray-500 tracking-wider font-sans">
          {trip.startDate.replace(/-/g, '.')} — {trip.endDate.replace(/-/g, '.')}
        </p>
        
        <div className="mt-1">
            <span className="inline-block border border-gray-300 px-2 py-[2px] text-[10px] text-gray-500 uppercase tracking-widest">
              Planning
            </span>
        </div>
      </div>
    </motion.div>
  );
}