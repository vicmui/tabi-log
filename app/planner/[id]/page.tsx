"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import ItineraryList from "@/components/planner/ItineraryList";
import AddActivityModal from "@/components/planner/AddActivityModal";
import ActivityDetailModal from "@/components/planner/ActivityDetailModal";
import ShareItinerary from "@/components/planner/ShareItinerary";
import TripMap from "@/components/planner/TripMap";
import { useTripStore } from "@/store/useTripStore";
import { ArrowLeft, Plus, MapPin, Calendar, Clock, Map as MapIcon, List as ListIcon, Trash2, CalendarX, Settings, Camera, Thermometer, Share } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Image from "next/image";
import clsx from "clsx";
import EditTripModal from "@/components/dashboard/EditTripModal";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from 'uuid';

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
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [weatherData, setWeatherData] = useState<{temp: string, code: number} | null>(null);

  useEffect(() => { setIsMounted(true); }, []);
  const trip = trips.find((t) => t.id === params.id);
  
  useEffect(() => { if (trip) { setEditTitle(trip.title); setEditStartDate(trip.startDate); } }, [trip]);
  useEffect(() => { if (trip && activeDay >= trip.dailyItinerary.length) { setActiveDay(Math.max(0, trip.dailyItinerary.length - 1)); } }, [trip, activeDay]);

  // 天氣 API
  useEffect(() => {
    const fetchWeather = async () => {
        if (!trip) return;
        const currentDay = trip.dailyItinerary[activeDay];
        let lat = 34.6937, lng = 135.5023;
        const firstAct = currentDay.activities.find(a => a.lat && a.lng);
        if (firstAct && firstAct.lat && firstAct.lng) { lat = firstAct.lat; lng = firstAct.lng; }

        try {
            const dateStr = currentDay.date;
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`);
            const data = await res.json();
            if (data.daily) {
                const max = data.daily.temperature_2m_max[0];
                const min = data.daily.temperature_2m_min[0];
                const code = data.daily.weather_code[0];
                setWeatherData({ temp: `${min}°-${max}°`, code });
            }
        } catch (e) { console.error("Weather fetch failed", e); }
    };
    fetchWeather();
  }, [activeDay, trip]);

  if (!isMounted || !trip) return <div className="p-10 text-center text-xs tracking-widest text-gray-400">LOADING...</div>;

  const currentDailyItinerary = trip.dailyItinerary[activeDay];
  const displayLocation = currentDailyItinerary?.activities.length > 0 ? currentDailyItinerary.activities[0].location.split(' ')[0] : "自由探索";

  const handleAddActivity = (data: any) => { addActivity(trip.id, activeDay, data); setIsModalOpen(false); };
  const handleDeleteDay = () => { if (trip.dailyItinerary.length <= 1) { alert("最少保留一天！"); return; } if (confirm(`確定刪除 Day ${activeDay + 1}?`)) { deleteDayFromTrip(trip.id, activeDay); } };
  const handleSaveSettings = () => { updateTripSettings(trip.id, editTitle, editStartDate, trip.coverImage || ""); setIsSettingsOpen(false); };
  
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if (!file) return;
      const filePath = `public/${trip.id}/day-covers/${activeDay}-${uuidv4()}`;
      const { error } = await supabase.storage.from('trip_files').upload(filePath, file);
      if (!error) { const { data: { publicUrl } } = supabase.storage.from('trip_files').getPublicUrl(filePath); updateDayCoverImage(trip.id, activeDay, publicUrl); }
  };

  // 🔥 複製分享連結功能
  const handleCopyShareLink = () => {
      const url = `${window.location.origin}/share/${trip.id}`;
      navigator.clipboard.writeText(url);
      alert("已複製分享連結！\n你可以傳送給朋友，他們只能查看不能編輯。");
  };

  return (
    <div className="flex h-screen bg-white font-sans text-jp-charcoal overflow-hidden">
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
            <div className="absolute inset-0 bg-black/10" /><div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
            <label className="absolute top-4 right-4 bg-white/80 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer hover:bg-white text-black"><Camera size={16}/><input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload}/></label>
            
            <div className="absolute bottom-0 left-0 right-0 px-6 md:px-16 pb-6 pt-20">
               <div className="animate-fade-in-up">
                 <h3 className="text-5xl md:text-7xl font-bold tracking-wide text-black mb-2 uppercase drop-shadow-sm" style={{fontFamily: 'var(--font-inter)'}}>Day {activeDay + 1}</h3>
                 <div className="flex items-center gap-3 text-[10px] text-gray-600 tracking-[0.3em] uppercase font-bold bg-white/80 backdrop-blur-sm w-fit px-3 py-1 rounded-full">
                    <MapPin size={10} /><span>{displayLocation}</span>
                    <span className="w-px h-3 bg-gray-400"></span>
                    <Clock size={10} /><span>{currentDailyItinerary?.date}</span>
                    {weatherData && <><span className="w-px h-3 bg-gray-400"></span><Thermometer size={10}/><span>{weatherData.temp}</span></>}
                 </div>
               </div>
            </div>
          </div>

          <div className="px-4 md:px-16 py-8 max-w-5xl mx-auto min-h-[500px] pb-32">
            <div className="flex justify-between items-center mb-10 border-b border-gray-100 pb-4 sticky top-0 bg-white/95 backdrop-blur z-10 pt-2">
               <div className="flex items-center gap-4"><span className="text-[10px] font-bold tracking-[0.2em] text-black uppercase">行程</span><button onClick={handleDeleteDay} className="text-gray-300 hover:text-red-400 transition-colors"><CalendarX size={14} /></button></div>
               <div className="flex gap-3 w-full md:w-auto overflow-x-auto no-scrollbar justify-end">
                  
                  {/* 🔥 Share Link */}
                  <button onClick={handleCopyShareLink} className="flex-none flex items-center gap-2 text-[10px] tracking-widest border border-gray-200 text-gray-500 px-3 py-2 rounded-lg hover:border-black hover:text-black transition-colors bg-white uppercase">
                    <Share size={12} /> 分享連結
                  </button>

                  {/* Share Image */}
                  {viewMode === 'list' && <ShareItinerary elementId="itinerary-capture-area" tripTitle={trip.title} day={`Day${activeDay+1}`} />}
                  
                  <button onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} className="flex-none flex items-center gap-2 text-[10px] tracking-widest border border-gray-200 text-gray-500 px-4 py-2 hover:border-black hover:text-black transition-colors bg-white uppercase rounded-lg">{viewMode === 'list' ? <><MapIcon size={12} /> 地圖總覽</> : <><ListIcon size={12} /> 行程列表</>}</button>
                  <button onClick={() => setIsModalOpen(true)} className="flex-none flex items-center gap-2 text-[10px] tracking-widest bg-black text-white px-5 py-2 hover:bg-gray-800 transition-colors shadow-lg active:scale-95 uppercase rounded-lg"><Plus size={12} /> 新增</button>
               </div>
            </div>

            {viewMode === 'list' ? (
                currentDailyItinerary ? <ItineraryList dayIndex={activeDay} activities={currentDailyItinerary.activities} tripId={trip.id} onActivityClick={(id) => setSelectedActivityId(id)} /> : (<div className="text-center py-32 text-gray-300 text-[10px] tracking-[0.3em] uppercase font-light">No Activities</div>)
            ) : (
                <div className="h-[60vh] md:h-[500px] w-full border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <TripMap activities={currentDailyItinerary?.activities || []} />
                </div>
            )}
          </div>
          
          <AddActivityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddActivity} />
          {selectedActivityId && <ActivityDetailModal tripId={trip.id} dayIndex={activeDay} activityId={selectedActivityId} onClose={() => setSelectedActivityId(null)} />}
          {isSettingsOpen && <EditTripModal trip={trip} onClose={()=>setIsSettingsOpen(false)} />}
        </div>
      </main>
    </div>
  );
}