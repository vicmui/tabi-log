"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import ItineraryList from "@/components/planner/ItineraryList";
import AddActivityModal from "@/components/planner/AddActivityModal";
import ActivityDetailModal from "@/components/planner/ActivityDetailModal";
import ShareItinerary from "@/components/planner/ShareItinerary"; // 新增
import { useTripStore } from "@/store/useTripStore";
import { ArrowLeft, Plus, MapPin, Calendar, Clock, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Image from "next/image";
import clsx from "clsx";

export default function PlannerPage() {
  const params = useParams();
  const { trips, addActivity } = useTripStore();
  const [activeDay, setActiveDay] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  useEffect(() => setIsMounted(true), []);
  const trip = trips.find((t) => t.id === params.id);
  
  if (!isMounted) return null;
  if (!trip) return <div className="p-10 text-center">找不到旅程</div>;

  const currentDailyItinerary = trip.dailyItinerary[activeDay];

  const handleAddActivity = (data: any) => {
    addActivity(trip.id, activeDay, data);
    setIsModalOpen(false);
  };

  const handleOpenDayRoute = () => {
    if (!currentDailyItinerary || currentDailyItinerary.activities.length < 2) { alert("請至少安排兩個地點"); return; }
    const acts = currentDailyItinerary.activities;
    const origin = encodeURIComponent(acts[0].location);
    const destination = encodeURIComponent(acts[acts.length - 1].location);
    const waypoints = acts.slice(1, -1).map(a => encodeURIComponent(a.location)).join('|');
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=transit`, '_blank');
  };

  return (
    <div className="flex h-screen bg-white font-sans text-jp-charcoal overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col md:flex-row h-full ml-0 md:ml-64 relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-100 bg-white shrink-0 z-30">
           <Link href="/" className="text-gray-500"><ArrowLeft size={20}/></Link>
           <h1 className="font-serif font-bold text-lg truncate w-2/3 text-center">{trip.title}</h1>
           <div className="w-5" /> 
        </div>

        {/* Desktop Sidebar (Day Selector) */}
        <div className="hidden md:flex w-64 border-r border-gray-100 bg-white h-full overflow-y-auto flex-col shrink-0 z-20">
          <div className="p-6 border-b border-gray-50 sticky top-0 bg-white z-10">
            <Link href="/" className="flex items-center gap-2 text-xs text-gray-400 hover:text-black mb-4 transition-colors"><ArrowLeft size={12}/> 返回首頁</Link>
            <h2 className="font-serif font-bold text-xl leading-tight mb-2 text-jp-charcoal">{trip.title}</h2>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 tracking-wider uppercase font-medium">
               <Calendar size={12} /><span>{trip.startDate} — {trip.endDate}</span>
            </div>
          </div>
          <div className="flex-1">
            {trip.dailyItinerary.map((dayItem, index) => (
              <button key={dayItem.day} onClick={() => setActiveDay(index)} className={`w-full text-left p-6 transition-all duration-300 group relative border-b border-gray-50 ${activeDay === index ? "bg-jp-charcoal text-white" : "bg-white hover:bg-gray-50 text-gray-400 hover:text-jp-charcoal"}`}>
                <div className="flex justify-between items-baseline relative z-10">
                   <span className="text-xs font-bold tracking-[0.2em] uppercase">Day {dayItem.day}</span>
                   <span className="text-[10px] opacity-60 font-medium">{dayItem.weather}</span>
                </div>
                <div className="text-[10px] mt-2 opacity-80 relative z-10 font-mono tracking-wide">{dayItem.date}</div>
                {activeDay === index && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Horizontal Day Selector */}
        <div className="md:hidden w-full bg-white border-b border-gray-100 z-20 shadow-sm shrink-0">
           <div className="flex overflow-x-auto snap-x hide-scrollbar py-3 px-4 gap-3">
              {trip.dailyItinerary.map((dayItem, index) => (
                 <button key={dayItem.day} onClick={() => setActiveDay(index)} className={clsx("flex-shrink-0 snap-start flex flex-col items-center justify-center w-16 h-16 rounded-xl border transition-all duration-200", activeDay === index ? "bg-jp-charcoal text-white border-black shadow-md scale-105" : "bg-gray-50 text-gray-400 border-gray-100")}>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Day</span>
                    <span className="text-xl font-serif font-bold leading-none">{dayItem.day}</span>
                    <span className="text-[9px] opacity-60 mt-1">{dayItem.weather}</span>
                 </button>
              ))}
           </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 relative overflow-y-auto bg-white scroll-smooth h-full"> 
          {/* Header Image */}
          <div className="h-40 md:h-64 relative w-full shrink-0">
            <Image src={trip.coverImage || ""} alt="Cover" fill className="object-cover object-top" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-6 md:px-12 pb-4 md:pb-8 pt-20 bg-gradient-to-t from-white to-transparent">
               <div>
                 <h3 className="text-3xl md:text-5xl font-serif font-bold tracking-widest text-jp-charcoal mb-1 md:mb-2">DAY {activeDay + 1}</h3>
                 <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-500 tracking-[0.15em] uppercase font-medium">
                    <MapPin size={12} /><span>大阪</span><span className="mx-2 text-gray-300">|</span><Clock size={12} /><span>{currentDailyItinerary?.date}</span>
                 </div>
               </div>
            </div>
          </div>

          <div className="px-4 md:px-12 py-4 md:py-8 max-w-4xl mx-auto min-h-[500px] pb-24">
            <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4 sticky top-0 bg-white/95 backdrop-blur z-10 pt-2">
               <span className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase hidden md:inline">當日行程</span>
               
               {/* 頂部按鈕群 (水平滑動以適應手機) */}
               <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
                  {/* 🔥 Share Button (Killer Feature) */}
                  <ShareItinerary elementId="itinerary-capture-area" tripTitle={trip.title} day={`Day${activeDay+1}`} />
                  
                  <button onClick={handleOpenDayRoute} className="flex-none flex items-center gap-2 text-[10px] tracking-widest border border-gray-200 text-gray-500 px-3 py-2 rounded-lg hover:border-black hover:text-black transition-colors bg-white uppercase">
                    <MapIcon size={12} /> 路線
                  </button>
                  <button onClick={() => setIsModalOpen(true)} className="flex-none flex items-center gap-2 text-[10px] tracking-widest bg-jp-charcoal text-white px-4 py-2 rounded-lg hover:bg-black transition-colors shadow-lg active:scale-95 uppercase">
                    <Plus size={12} /> 新增
                  </button>
               </div>
            </div>

            {currentDailyItinerary ? (
              <ItineraryList dayIndex={activeDay} activities={currentDailyItinerary.activities} tripId={trip.id} onActivityClick={(id) => setSelectedActivityId(id)} />
            ) : (<div className="text-center py-24 text-gray-300 text-xs tracking-widest uppercase">暫無活動</div>)}
          </div>
          
          <AddActivityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddActivity} />
          {selectedActivityId && <ActivityDetailModal tripId={trip.id} dayIndex={activeDay} activityId={selectedActivityId} onClose={() => setSelectedActivityId(null)} />}
        </div>
      </main>
    </div>
  );
}