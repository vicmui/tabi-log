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

  // Real progress from checklist
  const totalPlans = trip.plans?.length || 0;
  const completedPlans = trip.plans?.filter(p => p.isCompleted).length || 0;
  const progress = totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 100) : 0;

  // Countdown
  const today = new Date(); today.setHours(0,0,0,0);
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const daysUntil = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isOngoing = today >= start && today <= end;
  const isPast = today > end;
  const statusLabel = isPast ? "已完成" : isOngoing ? "旅途中 ✈️" : "規劃中";
  const countdownText = isPast ? null : isOngoing
    ? `第 ${Math.ceil((today.getTime() - start.getTime()) / (1000*60*60*24)) + 1} 天`
    : `還有 ${daysUntil} 天`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group cursor-pointer flex flex-col gap-3"
      onClick={handleClick}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100">
        {trip.coverImage ? (
          <Image src={trip.coverImage} alt={trip.title} fill className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-200 via-neutral-300 to-neutral-400" />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
        {countdownText && (
          <div className={`absolute top-3 left-3 px-2.5 py-1 text-xs font-medium tracking-widest uppercase rounded-full ${isOngoing ? 'bg-black text-white' : 'bg-white/90 text-black backdrop-blur-sm'}`}>
            {countdownText}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-baseline">
          <h3 className="text-sm font-semibold tracking-widest text-black group-hover:underline decoration-1 underline-offset-4 truncate mr-2">{trip.title}</h3>
          <span className="text-xs font-mono text-gray-500 shrink-0">{progress}%</span>
        </div>
        <p className="text-[11px] text-gray-500 tracking-wider">{trip.startDate.replace(/-/g,'.')} — {trip.endDate.replace(/-/g,'.')}</p>
        <div className="h-[2px] bg-gray-100 w-full rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#16a34a' : '#1a1a1a' }} />
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="inline-block border border-gray-300 px-2 py-[2px] text-xs text-gray-500 uppercase tracking-widest">{statusLabel}</span>
          {totalPlans > 0 && <span className="text-xs text-gray-500 font-mono">{completedPlans}/{totalPlans} 項</span>}
        </div>
      </div>
    </motion.div>
  );
}
