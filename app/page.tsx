"use client";
import Sidebar from "@/components/layout/Sidebar";
import TripCard from "@/components/dashboard/TripCard";
import { useTripStore } from "@/store/useTripStore";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { differenceInDays, parseISO } from "date-fns";

export default function Home() {
  const { trips, addTrip } = useTripStore();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  if (!isMounted) return null;

  const handleAddTrip = () => {
    const title = prompt("請輸入旅程名稱 (例如：2026 東京賞櫻)：");
    if (!title) return;
    addTrip({
      title: title,
      startDate: "2026-03-20",
      endDate: "2026-03-25",
      status: "planning",
      coverImage: "https://images.unsplash.com/photo-1522383225653-ed111181a951?q=80&w=2000&auto=format&fit=crop"
    });
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="flex-1 p-8 ml-0 md:ml-64">
        <div className="flex justify-between items-center mb-12 mt-4">
           <div>
             <h1 className="text-4xl font-serif font-bold text-jp-charcoal tracking-wide">我的旅程</h1>
             <p className="text-gray-400 mt-2 text-sm tracking-widest uppercase">My Voyages</p>
           </div>
           <button onClick={handleAddTrip} className="bg-jp-charcoal text-white px-6 py-3 flex items-center gap-2 hover:bg-black transition-colors shadow-lg active:scale-95 text-xs tracking-widest uppercase">
             <Plus size={16} /> 新增旅程
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {trips.map((trip) => {
                const daysLeft = differenceInDays(parseISO(trip.startDate), new Date());
                const totalActs = trip.dailyItinerary.reduce((acc, day) => acc + day.activities.length, 0);
                const visitedActs = trip.dailyItinerary.reduce((acc, day) => acc + day.activities.filter(a=>a.isVisited).length, 0);
                const progress = totalActs > 0 ? Math.round((visitedActs / totalActs) * 100) : 0;

                return (
                  <div key={trip.id} className="relative">
                      {/* 在這裡直接用 TripCard 組件，但我為了加強功能，這裡直接寫 Card UI */}
                      <div className="group cursor-pointer bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 overflow-hidden h-[360px] flex flex-col relative">
                          <div className="h-1/2 w-full relative overflow-hidden">
                              <img src={trip.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                              <div className="absolute bottom-4 left-4 bg-white/90 px-3 py-1 text-xs font-bold rounded-full">
                                  {daysLeft > 0 ? `還有 ${daysLeft} 天出發` : daysLeft === 0 ? "今天出發！" : "旅程進行中 / 已結束"}
                              </div>
                          </div>
                          <div className="p-6 flex flex-col justify-between flex-1">
                              <div>
                                  <h3 className="text-xl font-bold font-serif mb-2">{trip.title}</h3>
                                  <p className="text-xs text-gray-500">{trip.startDate} — {trip.endDate}</p>
                              </div>
                              <div>
                                  <div className="flex justify-between text-[10px] text-gray-400 mb-1 uppercase tracking-widest">
                                      <span>Progress</span>
                                      <span>{progress}%</span>
                                  </div>
                                  <div className="h-1 bg-gray-100 w-full"><div className="h-full bg-jp-charcoal" style={{width: `${progress}%`}}/></div>
                              </div>
                              <a href={`/planner/${trip.id}`} className="absolute inset-0"></a>
                          </div>
                      </div>
                  </div>
                )
            })}
        </div>
      </main>
    </div>
  );
}