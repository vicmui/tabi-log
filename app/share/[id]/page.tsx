"use client";
import { useState, useEffect } from "react";
import ItineraryList from "@/components/planner/ItineraryList";
import TripMap from "@/components/planner/TripMap";
import { useTripStore } from "@/store/useTripStore";
import { MapPin, Calendar, Clock, Map as MapIcon, List as ListIcon } from "lucide-react";
import { useParams } from "next/navigation";
import Image from "next/image";
import clsx from "clsx";

export default function SharePage() {
  const params = useParams();
  const { trips, loadTripsFromCloud } = useTripStore();
  const [activeDay, setActiveDay] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // 即使在 Share 頁面，也要嘗試下載最新資料 (唯讀)
  useEffect(() => {
    loadTripsFromCloud();
    setIsMounted(true);
  }, []);

  const trip = trips.find((t) => t.id === params.id);
  
  // 自動調整 activeDay 
  useEffect(() => { if (trip && activeDay >= trip.dailyItinerary.length) { setActiveDay(Math.max(0, trip.dailyItinerary.length - 1)); } }, [trip, activeDay]);

  if (!isMounted || !trip) return <div className="p-10 text-center text-xs tracking-widest text-gray-400">LOADING TRIP...</div>;

  const currentDailyItinerary = trip.dailyItinerary[activeDay];
  const displayLocation = currentDailyItinerary?.activities.length > 0 ? currentDailyItinerary.activities[0].location.split(' ')[0] : trip.title;

  return (
    <div className="min-h-screen bg-white font-sans text-jp-charcoal">
      {/* 簡化版 Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 px-6 py-4 flex justify-between items-center">
          <div>
             <h1 className="font-serif font-bold text-lg tracking-widest uppercase">VM&apos;s Build</h1>
             <p className="text-[10px] text-gray-400 tracking-[0.2em] uppercase">Shared Itinerary</p>
          </div>
          <div className="text-xs font-bold bg-black text-white px-3 py-1 rounded-full uppercase tracking-widest">Read Only</div>
      </div>

      <div className="relative"> 
          {/* Cover */}
          <div className="h-48 md:h-72 relative w-full">
            <Image src={currentDailyItinerary?.coverImage || trip.coverImage || ""} alt="Cover" fill className="object-cover object-top" priority />
            <div className="absolute inset-0 bg-black/10" /><div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-6 md:px-16 pb-6 pt-20">
               <div className="animate-fade-in-up">
                 <h3 className="text-4xl md:text-6xl font-black tracking-tighter text-black mb-2 uppercase drop-shadow-sm" style={{fontFamily: 'var(--font-inter)'}}>Day {activeDay + 1}</h3>
                 <div className="flex items-center gap-3 text-[10px] text-gray-600 tracking-[0.3em] uppercase font-bold bg-white/80 backdrop-blur-sm w-fit px-3 py-1 rounded-full">
                    <MapPin size={10} /><span>{displayLocation}</span>
                    <span className="w-px h-3 bg-gray-400"></span>
                    <Clock size={10} /><span>{currentDailyItinerary?.date}</span>
                 </div>
               </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 pb-24">
             {/* Day Selector */}
             <div className="flex overflow-x-auto snap-x no-scrollbar py-2 gap-3 mb-8">
                {trip.dailyItinerary.map((dayItem, index) => (
                   <button key={dayItem.day} onClick={() => setActiveDay(index)} className={clsx("flex-shrink-0 snap-start flex flex-col items-center justify-center w-14 h-14 border transition-all duration-200 rounded-xl", activeDay === index ? "bg-black text-white border-black shadow-lg scale-105" : "bg-white text-gray-400 border-gray-200")}>
                      <span className="text-[9px] font-bold uppercase tracking-wider">Day</span>
                      <span className="text-lg font-serif font-bold leading-none">{dayItem.day}</span>
                   </button>
                ))}
             </div>

             {/* Content Toggle */}
             <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-2">
                 <span className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">當日行程</span>
                 <button onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} className="flex items-center gap-2 text-[10px] tracking-widest border border-gray-200 text-gray-500 px-4 py-2 hover:border-black hover:text-black transition-colors bg-white uppercase rounded-lg">
                    {viewMode === 'list' ? <><MapIcon size={12} /> 地圖總覽</> : <><ListIcon size={12} /> 行程列表</>}
                 </button>
             </div>

             {/* Content */}
             {viewMode === 'list' ? (
                // 🔥 使用 isReadOnly=true
                currentDailyItinerary ? <ItineraryList dayIndex={activeDay} activities={currentDailyItinerary.activities} tripId={trip.id} isReadOnly={true} /> : <div className="text-center py-20 text-gray-300">暫無行程</div>
             ) : (
                <div className="h-[60vh] w-full border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <TripMap activities={currentDailyItinerary?.activities || []} />
                </div>
             )}
          </div>
      </div>
    </div>
  );
}