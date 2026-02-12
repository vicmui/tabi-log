"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import ItineraryList from "@/components/planner/ItineraryList";
import AddActivityModal from "@/components/planner/AddActivityModal";
import ActivityDetailModal from "@/components/planner/ActivityDetailModal";
import ShareItinerary from "@/components/planner/ShareItinerary";
import TripMap from "@/components/planner/TripMap";
import { useTripStore } from "@/store/useTripStore";
import { ArrowLeft, Plus, MapPin, Calendar, Clock, Map as MapIcon, List as ListIcon, Trash2, CalendarX, Settings, Camera, Thermometer, Navigation, Share, Edit } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Image from "next/image";
import clsx from "clsx";
import EditTripModal from "@/components/dashboard/EditTripModal";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';

export default function PlannerPage() {
  const params = useParams();
  const { trips, addActivity, addDayToTrip, deleteDayFromTrip, updateTripSettings, updateDayCoverImage, updateDayLocation } = useTripStore();
  const [activeDay, setActiveDay] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  useEffect(() => { setIsMounted(true); }, []);
  const trip = trips.find((t) => t.id === params.id);
  
  useEffect(() => { if (trip) { setEditTitle(trip.title); setEditStartDate(trip.startDate); } }, [trip]);

  if (!isMounted || !trip) return null;

  const currentDailyItinerary = trip.dailyItinerary[activeDay];
  const displayLocation = currentDailyItinerary?.customLocation || (currentDailyItinerary?.activities?.length > 0 ? currentDailyItinerary.activities[0].location.split(' ')[0] : "自由探索");

  const handleEditLocation = () => {
      const newLoc = prompt("修改當日地點名稱:", displayLocation);
      if (newLoc) updateDayLocation(trip.id, activeDay, newLoc);
  };

  const handleAddActivity = (data: any) => { addActivity(trip.id, activeDay, data); setIsModalOpen(false); };
  const handleDeleteDay = () => { if (trip.dailyItinerary.length <= 1) { alert("最少保留一天！"); return; } if (confirm(`確定要刪除 Day ${activeDay + 1}?`)) deleteDayFromTrip(trip.id, activeDay); };
  const handleSaveSettings = () => { updateTripSettings(trip.id, editTitle, editStartDate, trip.coverImage || ""); setIsSettingsOpen(false); };
  const handleCopyShareLink = () => { const url = `${window.location.origin}/share/${trip.id}`; navigator.clipboard.writeText(url); alert("已複製分享連結！"); };
  const handleOpenDayRoute = () => { if (!currentDailyItinerary || currentDailyItinerary.activities.length < 2) { alert("請至少安排兩個地點"); return; } const acts = currentDailyItinerary.activities.filter(a => a && (a.address || a.location)); const origin = acts[0].lat ? `${acts[0].lat},${acts[0].lng}` : encodeURIComponent(acts[0].address || acts[0].location); const destination = acts[acts.length - 1].lat ? `${acts[acts.length - 1].lat},${acts[acts.length - 1].lng}` : encodeURIComponent(acts[acts.length - 1].address || acts[acts.length - 1].location); const waypoints = acts.slice(1, -1).map(a => a.lat ? `${a.lat},${a.lng}` : encodeURIComponent(a.address || a.location)).join('|'); window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=transit`, '_blank'); };
  
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if (!file) return;
      const filePath = `public/${trip.id}/day-covers/${activeDay}-${uuidv4()}`;
      const { error } = await supabase.storage.from('trip_files').upload(filePath, file);
      if (!error) { const { data: { publicUrl } } = supabase.storage.from('trip_files').getPublicUrl(filePath); updateDayCoverImage(trip.id, activeDay, publicUrl); }
  };

  return (
    <div className="flex h-screen bg-white font-sans text-jp-charcoal overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col md:flex-row h-full ml-0 md:ml-64 relative overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-100 bg-white shrink-0 z-40">
           <Link href="/" className="text-gray-400"><ArrowLeft size={22}/></Link>
           <h1 className="font-bold text-sm tracking-widest uppercase truncate w-2/3 text-center">{trip.title}</h1>
           <button onClick={() => setIsModalOpen(true)} className="bg-black text-white p-2 rounded-lg shadow-sm"><Plus size={20}/></button>
        </div>

        {/* Desktop Days Sidebar */}
        <div className="hidden md:flex w-72 border-r border-gray-100 bg-white h-full overflow-y-auto flex-col shrink-0 z-20 pt-10">
          <div className="px-8 pb-8 border-b border-gray-50 sticky top-0 bg-white z-10">
            <Link href="/" className="flex items-center gap-2 text-[10px] text-gray-300 hover:text-black mb-6 transition-colors tracking-widest uppercase font-medium"><ArrowLeft size={10}/> BACK</Link>
            <div className="group cursor-pointer" onClick={()=>setIsSettingsOpen(true)}>
               <h2 className="text-lg font-bold leading-snug mb-1 text-black tracking-tight">{trip.title}</h2>
               <p className="text-[9px] text-gray-400 tracking-[0.2em] uppercase">{trip.startDate}</p>
            </div>
          </div>
          <div className="flex-1 py-4">
            {trip.dailyItinerary.map((dayItem, index) => (
              <button key={dayItem.day} onClick={() => setActiveDay(index)} className={`w-full text-left py-6 px-8 transition-all duration-300 group relative border-b border-gray-50 last:border-0 ${activeDay === index ? "bg-gray-50 text-black font-semibold" : "hover:bg-gray-50 text-gray-400 font-light"}`}>
                <div className="flex justify-between items-center"><span className="text-xs tracking-widest uppercase">Day {dayItem.day}</span><span className="text-[9px] uppercase">{format(parseISO(dayItem.date), 'EEE')}</span></div>
                <div className="text-[9px] mt-1 opacity-60 tracking-widest">{dayItem.date}</div>
                {activeDay === index && <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-black" />}
              </button>
            ))}
            <button onClick={() => addDayToTrip(trip.id)} className="w-full py-6 text-[10px] text-gray-300 hover:text-black flex items-center justify-center gap-2 uppercase tracking-widest transition-colors"><Plus size={12}/> Add Day</button>
          </div>
        </div>

        {/* Mobile Slider */}
        <div className="md:hidden w-full bg-white border-b border-gray-100 z-30 shrink-0 shadow-sm">
           <div className="flex overflow-x-auto snap-x no-scrollbar py-4 px-4 gap-3 items-center">
              {trip.dailyItinerary.map((dayItem, index) => (
                   <button key={dayItem.day} onClick={() => setActiveDay(index)} className={clsx("flex-shrink-0 snap-center flex flex-col items-center justify-center w-20 h-24 border transition-all duration-200 rounded-xl", activeDay === index ? "bg-black text-white border-black shadow-lg" : "bg-white text-gray-400 border-gray-200")}>
                      <span className="text-[9px] font-bold uppercase tracking-widest">{format(parseISO(dayItem.date), 'EEE')}</span>
                      <span className="text-xl font-bold leading-none my-1">{dayItem.day}</span>
                   </button>
              ))}
              <button onClick={() => addDayToTrip(trip.id)} className="flex-shrink-0 flex items-center justify-center w-12 h-24 border border-dashed border-gray-200 text-gray-300 rounded-xl"><Plus size={20}/></button>
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-y-auto bg-white scroll-smooth h-full no-scrollbar pb-32"> 
          <div className="h-44 md:h-80 relative w-full shrink-0 group">
            {/* 🔥 修正：移除了所有 Gradient 和黑色遮罩 */}
            <Image src={currentDailyItinerary?.coverImage || trip.coverImage || ""} alt="Cover" fill className="object-cover object-center" priority />
            
            <div className="absolute bottom-0 left-0 right-0 px-6 md:px-16 pb-6 pt-20">
               <div className="animate-fade-in-up">
                 {/* 文字加入 Drop Shadow 確保全彩圖上也可讀 */}
                 <h3 className="text-4xl md:text-7xl font-bold tracking-tight uppercase leading-none text-black drop-shadow-[0_2px_10px_rgba(255,255,255,0.8)]">Day {activeDay + 1}</h3>
                 <button onClick={handleEditLocation} className="flex items-center gap-3 text-[10px] text-gray-600 tracking-[0.3em] uppercase font-bold mt-2 bg-white/90 backdrop-blur-sm w-fit px-3 py-1 rounded-full shadow-md hover:bg-white transition-all z-20">
                    <MapPin size={10} /><span>{displayLocation}</span><Edit size={8} className="opacity-50"/>
                    <span className="w-px h-3 bg-gray-300"></span><Clock size={10} /><span>{currentDailyItinerary?.date}</span>
                 </button>
               </div>
            </div>
            <label className="absolute top-4 right-4 bg-white/50 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer text-black hover:bg-white"><Camera size={16}/><input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload}/></label>
          </div>

          <div className="px-4 md:px-12 py-6 max-w-5xl mx-auto min-h-[500px]">
            <div className="mb-8 border-b border-gray-100 pb-4 sticky top-0 bg-white/95 backdrop-blur z-30 pt-2">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4"><span className="text-[11px] font-bold tracking-[0.2em] text-black uppercase">行程規劃</span><button onClick={handleDeleteDay} className="text-gray-300 hover:text-red-400 p-1"><CalendarX size={16} /></button></div>
                  <div className="flex gap-2 w-full md:w-auto overflow-x-auto hide-scrollbar pb-1">
                      <button onClick={handleCopyShareLink} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest border border-gray-200 text-gray-500 py-2.5 rounded-xl bg-white uppercase hover:border-black transition-all whitespace-nowrap px-5"><Share size={14} /> 分享</button>
                      <button onClick={handleOpenDayRoute} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest border border-gray-200 text-gray-500 py-2.5 rounded-xl bg-white uppercase hover:border-black transition-all whitespace-nowrap px-5"><Navigation size={14} /> 路線</button>
                      <button onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest border border-gray-200 text-gray-500 py-2 rounded-xl bg-white uppercase hover:border-black transition-all whitespace-nowrap px-5">{viewMode === 'list' ? <><MapIcon size={14} /> 地圖</> : <><ListIcon size={14} /> 列表</>}</button>
                      <button onClick={() => setIsModalOpen(true)} className="hidden md:flex flex-none items-center gap-2 text-[10px] tracking-widest bg-black text-white px-6 py-2.5 hover:bg-gray-800 transition-colors shadow-lg uppercase rounded-xl font-bold"><Plus size={12} /> 新增活動</button>
                  </div>
               </div>
            </div>
            <div className="w-full">
                {viewMode === 'list' ? (
                    currentDailyItinerary ? <ItineraryList dayIndex={activeDay} activities={currentDailyItinerary.activities} tripId={trip.id} onActivityClick={(id) => setSelectedActivityId(id)} /> : <div className="text-center py-20 text-gray-300 text-[10px] uppercase tracking-widest">今日暫無行程安排</div>
                ) : (
                    <div className="h-[65dvh] w-full border border-gray-200 rounded-3xl overflow-hidden shadow-sm bg-gray-50"><TripMap activities={currentDailyItinerary?.activities || []} /></div>
                )}
            </div>
          </div>
          <AddActivityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddActivity} />
          {selectedActivityId && <ActivityDetailModal tripId={trip.id} dayIndex={activeDay} activityId={selectedActivityId} onClose={() => setSelectedActivityId(null)} />}
          {isSettingsOpen && <EditTripModal trip={trip} onClose={()=>setIsSettingsOpen(false)} />}
        </div>
      </main>
    </div>
  );
}