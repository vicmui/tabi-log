"use client";
import Sidebar from "@/components/layout/Sidebar";
import EditTripModal from "@/components/dashboard/EditTripModal"; // 新增
import { useTripStore } from "@/store/useTripStore";
import { Plus, Settings, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { differenceInDays, parseISO } from "date-fns";
import Link from "next/link";

export default function Home() {
  const { trips, addTrip, deleteTrip } = useTripStore();
  const [isMounted, setIsMounted] = useState(false);
  const [editingTrip, setEditingTrip] = useState<any>(null); // 儲存要編輯的旅程

  useEffect(() => setIsMounted(true), []);

  if (!isMounted) return <div className="animate-pulse">Loading...</div>;

  const handleAddTrip = () => {
    const title = prompt("請輸入旅程名稱 (例如：2026 東京賞櫻)：");
    if (!title) return;
    addTrip({
      title: title,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
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
             <h1 className="text-4xl font-light tracking-ut-wide text-jp-black uppercase">我的旅程</h1>
             <p className="text-gray-400 mt-2 text-xs tracking-widest uppercase">My Voyages</p>
           </div>
           <button onClick={handleAddTrip} className="bg-jp-black text-white px-6 py-3 flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-lg active:scale-95 text-xs tracking-widest uppercase rounded">
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
                  <div key={trip.id} className="relative group cursor-pointer bg-white border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden h-[360px] flex flex-col">
                      <Link href={`/planner/${trip.id}`} className="absolute inset-0 z-10" />

                      <div className="h-1/2 w-full relative overflow-hidden">
                          <img src={trip.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                          <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 text-xs font-bold rounded-full">
                              {daysLeft > 0 ? `還有 ${daysLeft} 天` : "進行中"}
                          </div>
                          {/* 🔥 編輯/刪除按鈕 */}
                          <div className="absolute top-4 right-4 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={()=>setEditingTrip(trip)} className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100"><Settings size={14}/></button>
                              <button onClick={()=>deleteTrip(trip.id)} className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 text-red-500"><Trash2 size={14}/></button>
                          </div>
                      </div>
                      <div className="p-6 flex flex-col justify-between flex-1">
                          <div>
                              <h3 className="text-xl font-medium mb-1 tracking-wide">{trip.title}</h3>
                              <p className="text-xs text-gray-400 font-light tracking-widest">{trip.startDate} — {trip.endDate}</p>
                          </div>
                          <div>
                              <div className="flex justify-between text-[10px] text-gray-400 mb-1 uppercase tracking-widest"><span>進度</span><span>{progress}%</span></div>
                              <div className="h-1 bg-gray-100 w-full"><div className="h-full bg-jp-black" style={{width: `${progress}%`}}/></div>
                          </div>
                      </div>
                  </div>
                )
            })}
        </div>

        {/* 編輯旅程 Modal */}
        {editingTrip && (
            <EditTripModal 
              trip={editingTrip}
              onClose={() => setEditingTrip(null)}
            />
        )}
      </main>
    </div>
  );
}