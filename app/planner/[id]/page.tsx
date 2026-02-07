"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import ItineraryList from "@/components/planner/ItineraryList";
import AddActivityModal from "@/components/planner/AddActivityModal";
import ActivityDetailModal from "@/components/planner/ActivityDetailModal";
import ShareItinerary from "@/components/planner/ShareItinerary";
import { useTripStore } from "@/store/useTripStore";
import { ArrowLeft, Plus, MapPin, Calendar, Clock, Map as MapIcon, Trash2, CalendarX, Settings, Camera } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Image from "next/image";
import clsx from "clsx";

export default function PlannerPage() {
  const params = useParams();
  const { trips, addActivity, addDayToTrip, deleteDayFromTrip, updateTripSettings, updateDayCoverImage } = useTripStore();
  const [activeDay, setActiveDay] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editStartDate, setEditStartDate] = useState("");

  useEffect(() => { setIsMounted(true); }, []);
  const trip = trips.find((t) => t.id === params.id);
  
  useEffect(() => { if (trip) { setEditTitle(trip.title); setEditStartDate(trip.startDate); } }, [trip]);
  useEffect(() => { if (trip && activeDay >= trip.dailyItinerary.length) { setActiveDay(Math.max(0, trip.dailyItinerary.length - 1)); } }, [trip, activeDay]);

  if (!isMounted || !trip) return <div className="p-10 text-center text-xs tracking-widest text-gray-400">LOADING...</div>;

  const currentDailyItinerary = trip.dailyItinerary[activeDay];

  const handleAddActivity = (data: any) => { addActivity(trip.id, activeDay, data); setIsModalOpen(false); };
  const handleDeleteDay = () => { if (trip.dailyItinerary.length <= 1) { alert("最少保留一天！"); return; } if (confirm(`確定刪除 Day ${activeDay + 1}?`)) { deleteDayFromTrip(trip.id, activeDay); } };
  const handleSaveSettings = () => { updateTripSettings(trip.id, editTitle, editStartDate, trip.coverImage || ""); setIsSettingsOpen(false); };
  
  const handleChangeDayCover = () => {
    const newUrl = prompt("請輸入新的封面圖片 URL:", currentDailyItinerary?.coverImage || trip.coverImage);
    if (newUrl) updateDayCoverImage(trip.id, activeDay, newUrl);
  };
  
  const handleOpenDayRoute = () => { if (!currentDailyItinerary || currentDailyItinerary.activities.length < 2) { alert("請至少安排兩個地點"); return; } const acts = currentDailyItinerary.activities; const origin = encodeURIComponent(acts[0].location); const destination = encodeURIComponent(acts[acts.length - 1].location); const waypoints = acts.slice(1, -1).map(a => encodeURIComponent(a.location)).join('|'); window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=transit`, '_blank'); };

  return (
    <div className="flex h-screen bg-white font-sans text-jp-black overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col md:flex-row h-full ml-0 md:ml-64 relative">
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-100 bg-white shrink-0 z-30"><Link href="/" className="text-gray-400"><ArrowLeft size={20}/></Link><button onClick={()=>setIsSettingsOpen(true)} className="text-sm font-medium tracking-wide truncate w-2/3 text-center flex items-center justify-center gap-2">{trip.title} <Settings size={12} className="text-gray-300"/></button><div className="w-5" /></div>

        <div className="hidden md:flex w-64 border-r border-gray-100 bg-white h-full overflow-y-auto flex-col shrink-0 z-20 pt-10">
          <div className="px-8 pb-8 border-b border-gray-50 sticky top-0 bg-white z-10">
            <Link href="/" className="flex items-center gap-2 text-[10px] text-gray-300 hover:text-black mb-6 transition-colors tracking-widest uppercase"><ArrowLeft size={10}/> Back</Link>
            <div className="group cursor-pointer" onClick={()=>setIsSettingsOpen(true)}><h2 className="text-lg font-light leading-snug mb-2 text-black tracking-wide group-hover:underline decoration-1 underline-offset-4">{trip.title}</h2><div className="flex items-center gap-2 text-[9px] text-gray-400 tracking-[0.2em] uppercase font-light"><Calendar size={10} /><span>{trip.startDate}</span></div></div>
          </div>
          <div className="flex-1 py-4">{trip.dailyItinerary.map((dayItem, index) => (<button key={dayItem.day} onClick={() => setActiveDay(index)} className={`w-full text-left py-4 px-8 transition-all duration-300 group relative ${activeDay === index ? "bg-gray-50" : "hover:bg-gray-50"}`}><div className="flex justify-between items-center relative z-10"><span className={clsx("text-xs tracking-[0.2em] uppercase", activeDay === index ? "font-medium text-black" : "font-light text-gray-400")}>Day {dayItem.day}</span><span className="text-[9px] text-gray-300 font-light">{dayItem.weather}</span></div><div className="text-[9px] mt-1 text-gray-300 font-light tracking-widest">{dayItem.date}</div>{activeDay === index && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-black" />}</button>))}
            <button onClick={() => addDayToTrip(trip.id)} className="w-full py-6 text-[10px] text-gray-300 hover:text-black flex items-center justify-center gap-2 uppercase tracking-[0.2em] transition-colors"><Plus size={12}/> Add Day</button>
          </div>
        </div>

        <div className="md:hidden w-full bg-white border-b border-gray-100 z-20 shadow-sm shrink-0">
           <div className="flex overflow-x-auto snap-x no-scrollbar py-3 px-4 gap-3 items-center">
              {trip.dailyItinerary.map((dayItem, index) => (<button key={dayItem.day} onClick={() => setActiveDay(index)} className={clsx("flex-shrink-0 snap-start flex flex-col items-center justify-center w-14 h-14 border transition-all duration-200", activeDay === index ? "bg-black text-white border-black" : "bg-white text-gray-400 border-gray-200")}><span className="text-[9px] font-light uppercase tracking-wider">Day</span><span className="text-lg font-light leading-none">{dayItem.day}</span></button>))}
              <button onClick={() => addDayToTrip(trip.id)} className="flex-shrink-0 flex flex-col items-center justify-center w-10 h-14 border border-dashed border-gray-300 text-gray-400"><Plus size={16}/></button>
           </div>
        </div>

        <div className="flex-1 relative overflow-y-auto bg-white scroll-smooth h-full"> 
          <div className="h-40 md:h-72 relative w-full shrink-0 group">
            <Image src={currentDailyItinerary?.coverImage || trip.coverImage || ""} alt="Cover" fill className="object-cover object-top" priority />
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
            
            {/* 🔥 更換每日封面按鈕 */}
            <button onClick={handleChangeDayCover} className="absolute top-4 right-4 bg-white/50 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"><Camera size={16}/></button>

            <div className="absolute bottom-0 left-0 right-0 px-6 md:px-16 pb-6 pt-20">
               <div className="animate-fade-in-up"><h3 className="text-4xl md:text-6xl font-light tracking-[0.2em] text-black mb-2 uppercase" style={{fontFamily: 'var(--font-inter)'}}>Day {activeDay + 1}</h3><div className="flex items-center gap-3 text-[10px] text-gray-500 tracking-[0.3em] uppercase font-light"><MapPin size={10} /><span>大阪</span><span className="w-8 h-[1px] bg-gray-300"></span><Clock size={10} /><span>{currentDailyItinerary?.date}</span></div></div>
            </div>
          </div>

          <div className="px-4 md:px-16 py-8 max-w-5xl mx-auto min-h-[500px] pb-32">
            <div className="flex justify-between items-center mb-10 border-b border-gray-100 pb-4 sticky top-0 bg-white/95 backdrop-blur z-10 pt-2">
               <div className="flex items-center gap-4"><span className="text-[10px] font-bold tracking-[0.2em] text-black uppercase">行程</span><button onClick={handleDeleteDay} className="text-gray-300 hover:text-red-400 transition-colors" title="Delete"><CalendarX size={14} /></button></div>
               <div className="flex gap-3 w-full md:w-auto overflow-x-auto no-scrollbar justify-end">
                  <ShareItinerary elementId="itinerary-capture-area" tripTitle={trip.title} day={`Day${activeDay+1}`} />
                  <button onClick={handleOpenDayRoute} className="flex-none flex items-center gap-2 text-[10px] tracking-widest border border-gray-200 text-gray-500 px-4 py-2 hover:border-black hover:text-black transition-colors bg-white uppercase"><MapIcon size={12} /> Map</button>
                  <button onClick={() => setIsModalOpen(true)} className="flex-none flex items-center gap-2 text-[10px] tracking-widest bg-black text-white px-5 py-2 hover:bg-gray-800 transition-colors shadow-lg active:scale-95 uppercase"><Plus size={12} /> Add</button>
               </div>
            </div>

            {currentDailyItinerary ? <ItineraryList dayIndex={activeDay} activities={currentDailyItinerary.activities} tripId={trip.id} onActivityClick={(id) => setSelectedActivityId(id)} /> : (<div className="text-center py-32 text-gray-300 text-[10px] tracking-[0.3em] uppercase font-light">No Activities</div>)}
          </div>
          
          <AddActivityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddActivity} />
          {selectedActivityId && <ActivityDetailModal tripId={trip.id} dayIndex={activeDay} activityId={selectedActivityId} onClose={() => setSelectedActivityId(null)} />}
          {isSettingsOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"><div className="bg-white p-10 w-full max-w-md shadow-2xl relative border border-gray-100"><h2 className="font-light text-2xl mb-8 tracking-widest text-center uppercase">Settings</h2><div className="space-y-6"><div><label className="text-[10px] text-gray-400 block mb-2 tracking-widest uppercase">Trip Title</label><input className="w-full border-b border-gray-200 p-2 text-sm font-light focus:outline-none focus:border-black transition-colors" value={editTitle} onChange={e=>setEditTitle(e.target.value)}/></div><div><label className="text-[10px] text-gray-400 block mb-2 tracking-widest uppercase">Start Date</label><input type="date" className="w-full border-b border-gray-200 p-2 text-sm font-light focus:outline-none focus:border-black transition-colors" value={editStartDate} onChange={e=>setEditStartDate(e.target.value)}/></div></div><div className="flex gap-4 mt-10"><button onClick={()=>setIsSettingsOpen(false)} className="flex-1 border border-gray-200 py-3 text-[10px] tracking-widest uppercase hover:bg-gray-50 transition-colors">Cancel</button><button onClick={handleSaveSettings} className="flex-1 bg-black text-white py-3 text-[10px] tracking-widest uppercase hover:opacity-80 transition-opacity">Save</button></div></div></div>)}
        </div>
      </main>
    </div>
  );
}