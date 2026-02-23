"use client";
import Sidebar from "@/components/layout/Sidebar";
import EditTripModal from "@/components/dashboard/EditTripModal";
import { NewTripModal, ConfirmDialog } from "@/components/ui/Dialog";
import { useTripStore } from "@/store/useTripStore";
import { Plus, Settings, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { differenceInDays, parseISO } from "date-fns";
import Link from "next/link";

export default function Home() {
  const { trips, addTrip, deleteTrip, setActiveTrip } = useTripStore();
  const [isMounted, setIsMounted] = useState(false);
  const [editingTrip, setEditingTrip] = useState<any>(null);
  const [isNewTripOpen, setIsNewTripOpen] = useState(false);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);

  useEffect(() => setIsMounted(true), []);
  if (!isMounted) return <div className="p-10 animate-pulse text-center text-gray-400">Loading...</div>;

  const handleAddTrip = (data: { title: string; startDate: string; endDate: string }) => {
    addTrip({
      title: data.title,
      startDate: data.startDate,
      endDate: data.endDate,
      status: "planning",
      coverImage: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2000&auto=format&fit=crop"
    });
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setDeletingTripId(id);
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="flex-1 p-8 ml-0 md:ml-64 pb-24">
        <div className="flex justify-between items-center mb-12 mt-4">
           <div>
             <h1 className="text-3xl font-serif font-bold tracking-widest text-jp-charcoal uppercase mb-2">我的旅程</h1>
             <p className="text-gray-400 text-xs tracking-widest uppercase">My Voyages</p>
           </div>
           <button onClick={() => setIsNewTripOpen(true)} className="bg-jp-charcoal text-white px-6 py-3 flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-lg active:scale-95 text-xs tracking-widest uppercase rounded">
             <Plus size={16} /> 新增旅程
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {trips.map((trip) => {
                const daysLeft = differenceInDays(parseISO(trip.startDate), new Date());
                const totalActs = trip.dailyItinerary.reduce((acc, day) => acc + (day.activities?.filter(a => a)?.length || 0), 0);
                const visitedActs = trip.dailyItinerary.reduce((acc, day) => acc + (day.activities?.filter(a => a && a.isVisited)?.length || 0), 0);
                const progress = totalActs > 0 ? Math.round((visitedActs / totalActs) * 100) : 0;

                return (
                  <div key={trip.id} onClick={() => setActiveTrip(trip.id)} className="relative group cursor-pointer bg-white border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden h-[360px] flex flex-col rounded-lg">
                      <Link href={`/planner/${trip.id}`} className="absolute inset-0 z-10" />
                      <div className="h-1/2 w-full relative overflow-hidden">
                          <img src={trip.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                          <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 text-xs font-bold rounded-full z-20">
                              {daysLeft > 0 ? `還有 ${daysLeft} 天` : "進行中/已結束"}
                          </div>
                          <div className="absolute top-4 right-4 flex gap-2 z-30">
                              <button onClick={(e)=>{e.stopPropagation(); e.preventDefault(); setEditingTrip(trip)}} className="bg-white/80 p-2 rounded-full hover:bg-white text-gray-600 hover:text-black transition-colors"><Settings size={14}/></button>
                              <button onClick={(e)=>handleDelete(e, trip.id)} className="bg-white/80 p-2 rounded-full hover:bg-red-500 hover:text-white text-gray-600 transition-colors"><Trash2 size={14}/></button>
                          </div>
                      </div>
                      <div className="p-6 flex flex-col justify-between flex-1">
                          <div>
                              <h3 className="text-xl font-medium mb-1 tracking-wide truncate">{trip.title}</h3>
                              <p className="text-xs text-gray-400 font-light tracking-widest">{trip.startDate} — {trip.endDate}</p>
                          </div>
                          <div>
                              <div className="flex justify-between text-[10px] text-gray-400 mb-1 uppercase tracking-widest"><span>Progress</span><span>{progress}%</span></div>
                              <div className="h-1 bg-gray-100 w-full"><div className="h-full bg-black" style={{width: `${progress}%`}}/></div>
                          </div>
                      </div>
                  </div>
                );
            })}
        </div>

        {editingTrip && <EditTripModal trip={editingTrip} onClose={() => setEditingTrip(null)} />}

        <NewTripModal
          isOpen={isNewTripOpen}
          onClose={() => setIsNewTripOpen(false)}
          onConfirm={handleAddTrip}
        />

        <ConfirmDialog
          isOpen={!!deletingTripId}
          title="刪除旅程"
          message="確定要永久刪除此旅程嗎？所有行程、預訂及支出記錄將一併移除，無法復原。"
          confirmLabel="刪除"
          cancelLabel="取消"
          danger
          onConfirm={() => { if (deletingTripId) deleteTrip(deletingTripId); setDeletingTripId(null); }}
          onCancel={() => setDeletingTripId(null)}
        />
      </main>
    </div>
  );
}
