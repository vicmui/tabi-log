"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import ItineraryList from "@/components/planner/ItineraryList";
import AddActivityModal from "@/components/planner/AddActivityModal";
import ActivityDetailModal from "@/components/planner/ActivityDetailModal";
import ShareItinerary from "@/components/planner/ShareItinerary";
import TripMap from "@/components/planner/TripMap";
import { useTripStore } from "@/store/useTripStore";
import { ArrowLeft, Plus, MapPin, Calendar, Clock, Map as MapIcon, List as ListIcon, Trash2, CalendarX, Settings, Camera, Thermometer, Navigation, Sun, Cloud, CloudSun, CloudRain, Snowflake, Share } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Image from "next/image";
import clsx from "clsx";
import EditTripModal from "@/components/dashboard/EditTripModal";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO, differenceInDays } from 'date-fns';

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
  const [weatherMap, setWeatherMap] = useState<Record<string, { temp: string; code: number }>>({});

  useEffect(() => { setIsMounted(true); }, []);
  const trip = trips.find((t) => t.id === params.id);
  
  useEffect(() => { if (trip) { setEditTitle(trip.title); setEditStartDate(trip.startDate); } }, [trip]);
  useEffect(() => { if (trip && activeDay >= trip.dailyItinerary.length) { setActiveDay(Math.max(0, trip.dailyItinerary.length - 1)); } }, [trip, activeDay]);

  useEffect(() => {
    const fetchWeather = async () => {
        if (!trip || trip.dailyItinerary.length === 0) return;
        const startDate = trip.dailyItinerary[0].date;
        const endDate = trip.dailyItinerary[trip.dailyItinerary.length - 1].date;
        if (differenceInDays(parseISO(startDate), new Date()) > 14) return;
        try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=34.69&longitude=135.50&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${startDate}&end_date=${endDate}`);
            const data = await res.json();
            if (data.daily) {
                const newMap: any = {};
                data.daily.time.forEach((d: string, i: number) => {
                    newMap[d] = { temp: `${Math.round(data.daily.temperature_2m_min[i])}°/${Math.round(data.daily.temperature_2m_max[i])}°`, code: data.daily.weather_code[i] };
                });
                setWeatherMap(newMap);
            }
        } catch (e) {}
    };
    fetchWeather();
  }, [trip]);

  if (!isMounted || !trip) return <div className="p-10 text-center animate-pulse">LOADING...</div>;

  const currentDailyItinerary = trip.dailyItinerary[activeDay];
  const displayLocation = currentDailyItinerary?.activities.length > 0 ? currentDailyItinerary.activities[0].location.split(' ')[0] : "自由探索";

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}/share/${trip.id}`;
    navigator.clipboard.writeText(url);
    alert("已複製分享連結！你可以傳送給朋友，他們只能查看不能編輯。");
  };

  const WeatherIcon = ({ code }: { code?: number }) => {
    if (code === undefined) return <Sun size={12} className="text-gray-300" />;
    if (code <= 1) return <Sun size={12} className="text-orange-400" />;
    if (code <= 3) return <CloudSun size={12} className="text-gray-400" />;
    if (code >= 51 && code <= 67) return <CloudRain size={12} className="text-blue-400" />;
    return <Cloud size={12} className="text-gray-400" />;
  };

  return (
    <div className="flex h-screen bg-white font-sans text-jp-black overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col md:flex-row h-full ml-0 md:ml-64 relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-100 bg-white shrink-0 z-30">
           <Link href="/" className="text-gray-400"><ArrowLeft size={20}/></Link>
           <h1 className="font-bold text-sm tracking-widest uppercase">{trip.title}</h1>
           <button onClick={handleCopyShareLink} className="text-gray-400"><Share size={20}/></button>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-64 border-r border-gray-100 bg-white h-full overflow-y-auto flex-col shrink-0 z-20 pt-10">
          <div className="px-8 pb-8 border-b border-gray-50 sticky top-0 bg-white z-10">
            <Link href="/" className="flex items-center gap-2 text-[10px] text-gray-300 hover:text-black mb-6 tracking-widest uppercase"><ArrowLeft size={10}/> Back</Link>
            <div className="group cursor-pointer" onClick={()=>setIsSettingsOpen(true)}>
               <h2 className="text-lg font-bold leading-snug mb-1 text-black tracking-tight">{trip.title}</h2>
               <p className="text-[9px] text-gray-400 tracking-[0.2em] uppercase">{trip.startDate}</p>
            </div>
          </div>
          <div className="flex-1 py-4">
            {trip.dailyItinerary.map((dayItem, index) => {
              const info = weatherMap[dayItem.date];
              return (
                <button key={dayItem.day} onClick={() => setActiveDay(index)} className={`w-full text-left py-4 px-8 transition-all duration-300 group relative ${activeDay === index ? "bg-gray-50" : "hover:bg-gray-50"}`}>
                  <div className="flex justify-between items-center relative z-10">
                    <span className={clsx("text-xs tracking-[0.15em] uppercase", activeDay === index ? "font-bold text-black" : "font-light text-gray-400")}>Day {dayItem.day}</span>
                    <span className="text-[9px] text-gray-400 font-medium uppercase">{format(parseISO(dayItem.date), 'EEE')}</span>
                  </div>
                  <div className="text-[9px] mt-1 text-gray-300 font-light">{dayItem.date}</div>
                  <div className="mt-2 flex items-center gap-2 text-[9px] text-gray-400">
                     <WeatherIcon code={info?.code} />
                     <span>{info ? info.temp : "15°/25°"}</span>
                  </div>
                  {activeDay === index && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-black" />}
                </button>
              )
            })}
            <button onClick={() => addDayToTrip(trip.id)} className="w-full py-6 text-[10px] text-gray-300 hover:text-black flex items-center justify-center gap-2 uppercase tracking-[0.2em] transition-colors"><Plus size={12}/> Add Day</button>
          </div>
        </div>

        {/* 🔥 Mobile Day Selector: 加上星期同天氣 */}
        <div className="md:hidden w-full bg-white border-b border-gray-100 z-20 shadow-sm shrink-0">
           <div className="flex overflow-x-auto snap-x no-scrollbar py-4 px-4 gap-3 items-center">
              {trip.dailyItinerary.map((dayItem, index) => {
                 const info = weatherMap[dayItem.date];
                 return (
                   <button key={dayItem.day} onClick={() => setActiveDay(index)} className={clsx(
                     "flex-shrink-0 snap-start flex flex-col items-center justify-center w-20 h-24 border transition-all duration-200 rounded-xl", 
                     activeDay === index ? "bg-black text-white border-black shadow-lg scale-105" : "bg-white text-gray-400 border-gray-100"
                   )}>
                      <span className="text-[9px] font-bold uppercase tracking-widest">{format(parseISO(dayItem.date), 'EEE')}</span>
                      <span className="text-xl font-bold leading-none my-1">{dayItem.day}</span>
                      <div className="flex flex-col items-center gap-0.5 mt-1">
                         <WeatherIcon code={info?.code} />
                         <span className="text-[8px] font-medium">{info ? info.temp : "15°/25°"}</span>
                      </div>
                   </button>
                 )
              })}
              <button onClick={() => addDayToTrip(trip.id)} className="flex-shrink-0 flex items-center justify-center w-12 h-24 border border-dashed border-gray-200 text-gray-300 rounded-xl"><Plus size={20}/></button>
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-y-auto bg-white scroll-smooth h-full"> 
          <div className="h-40 md:h-72 relative w-full shrink-0 group">
            <Image src={currentDailyItinerary?.coverImage || trip.coverImage || ""} alt="Cover" fill className="object-cover object-center" priority />
            <div className="absolute inset-0 bg-black/10" /><div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-6 md:px-16 pb-6 pt-20 text-black">
               <h3 className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-none">Day {activeDay + 1}</h3>
               <div className="flex items-center gap-3 text-[10px] text-gray-600 tracking-[0.3em] uppercase font-bold mt-2 bg-white/80 backdrop-blur-sm w-fit px-3 py-1 rounded-full">
                  <MapPin size={10} /><span>{displayLocation}</span>
                  <span className="w-px h-3 bg-gray-300"></span>
                  <Clock size={10} /><span>{currentDailyItinerary?.date}</span>
               </div>
            </div>
          </div>

          <div className="px-4 md:px-16 py-8 max-w-5xl mx-auto min-h-[500px] pb-32">
            <div className="flex justify-between items-center mb-10 border-b border-gray-100 pb-4 sticky top-0 bg-white/95 backdrop-blur z-10 pt-2">
               <div className="flex items-center gap-4"><span className="text-[10px] font-bold tracking-[0.2em] text-black uppercase">Itinerary</span><button onClick={handleDeleteDay} className="text-gray-300 hover:text-red-400 transition-colors"><CalendarX size={14} /></button></div>
               <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar justify-end">
                  <button onClick={handleOpenDayRoute} className="flex-none flex items-center gap-2 text-[10px] tracking-widest border border-gray-200 text-gray-500 px-4 py-2 hover:border-black transition-colors bg-white uppercase rounded-lg"><Navigation size={12} /> Route</button>
                  <button onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} className="flex-none flex items-center gap-2 text-[10px] tracking-widest border border-gray-200 text-gray-500 px-4 py-2 hover:border-black transition-colors bg-white uppercase rounded-lg">{viewMode === 'list' ? <><MapIcon size={12} /> Map</> : <><ListIcon size={12} /> List</>}</button>
                  <button onClick={() => setIsModalOpen(true)} className="flex-none flex items-center gap-2 text-[10px] tracking-widest bg-black text-white px-5 py-2 hover:bg-gray-800 transition-colors shadow-lg uppercase rounded-lg"><Plus size={12} /> Add</button>
               </div>
            </div>
            {viewMode === 'list' ? (
                currentDailyItinerary ? <ItineraryList dayIndex={activeDay} activities={currentDailyItinerary.activities} tripId={trip.id} onActivityClick={(id) => setSelectedActivityId(id)} /> : <div className="text-center py-32 text-gray-300 text-[10px] uppercase">No Activities</div>
            ) : (
                <div className="h-[60vh] md:h-[500px] w-full"><TripMap activities={currentDailyItinerary?.activities || []} /></div>
            )}
          </div>
          <AddActivityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddActivity} />
          {selectedActivityId && <ActivityDetailModal tripId={trip.id} dayIndex={activeDay} activityId={selectedActivityId} onClose={() => setSelectedActivityId(null)} />}
        </div>
      </main>
    </div>
  );
}