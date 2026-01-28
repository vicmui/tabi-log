"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import ItineraryList from "@/components/planner/ItineraryList";
import AddActivityModal from "@/components/planner/AddActivityModal";
import ActivityDetailModal from "@/components/planner/ActivityDetailModal";
import { useTripStore } from "@/store/useTripStore";
import { ArrowLeft, Plus, MapPin, Calendar, Clock, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Image from "next/image";

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
    setIsModalOpen(false); // 確保關閉 Modal
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
    <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 flex flex-col md:flex-row h-screen overflow-hidden">
        <div className="w-full md:w-64 border-r border-gray-100 bg-white h-auto md:h-full overflow-y-auto flex flex-col z-20">
          <div className="p-6 sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-50 z-10">
            <Link href="/" className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-jp-charcoal transition-colors mb-8 tracking-widest uppercase group">
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform"/> 返回首頁
            </Link>
            <h2 className="font-serif font-bold text-xl leading-tight mb-3 text-jp-charcoal">{trip.title}</h2>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 tracking-wider uppercase font-medium">
               <Calendar size={12} /><span>{trip.startDate} — {trip.endDate}</span>
            </div>
          </div>
          <div className="flex-1 px-0 py-0">
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

        <div className="flex-1 h-full overflow-y-auto bg-white relative scroll-smooth">
          <div className="h-64 relative w-full">
            <Image src={trip.coverImage || ""} alt="Cover" fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-8 md:px-12 pb-8 pt-20 bg-gradient-to-t from-white to-transparent">
               <div>
                 <h3 className="text-5xl font-serif font-bold tracking-widest text-jp-charcoal mb-2">DAY {activeDay + 1}</h3>
                 <div className="flex items-center gap-2 text-xs text-gray-500 tracking-[0.15em] uppercase font-medium">
                    <MapPin size={12} /><span>大阪</span><span className="mx-2 text-gray-300">|</span><Clock size={12} /><span>規劃模式</span>
                 </div>
               </div>
            </div>
          </div>

          <div className="px-6 md:px-12 py-8 max-w-4xl mx-auto min-h-[500px]">
            <div className="flex justify-between items-end mb-12 border-b border-gray-100 pb-4">
               <span className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">當日行程</span>
               <div className="flex gap-3">
                  <button onClick={handleOpenDayRoute} className="flex items-center gap-2 text-[10px] tracking-widest border border-gray-200 text-gray-500 px-4 py-2 hover:border-black hover:text-black transition-colors bg-white uppercase">
                    <MapIcon size={12} /> 查看路線
                  </button>
                  <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 text-[10px] tracking-widest bg-jp-charcoal text-white px-5 py-3 hover:bg-black transition-colors shadow-none rounded-none active:translate-y-[1px] uppercase">
                    <Plus size={12} /> 新增活動
                  </button>
               </div>
            </div>

            {currentDailyItinerary ? (
              <ItineraryList 
                dayIndex={activeDay} 
                activities={currentDailyItinerary.activities} 
                tripId={trip.id} 
                onActivityClick={(id) => setSelectedActivityId(id)} 
              />
            ) : (<div className="text-center py-24 text-gray-300 text-xs tracking-widest uppercase">暫無活動</div>)}
          </div>
          
          <AddActivityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddActivity} />
          
          {selectedActivityId && (
            <ActivityDetailModal 
               tripId={trip.id} dayIndex={activeDay} activityId={selectedActivityId} onClose={() => setSelectedActivityId(null)}
            />
          )}
        </div>
      </main>
    </div>
  );
}