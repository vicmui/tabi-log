"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import ItineraryList from "@/components/planner/ItineraryList";
import AddActivityModal from "@/components/planner/AddActivityModal";
import ActivityDetailModal from "@/components/planner/ActivityDetailModal";
import ShareItinerary from "@/components/planner/ShareItinerary";
import TripMap from "@/components/planner/TripMap";
import { useTripStore } from "@/store/useTripStore";
import { ArrowLeft, Plus, MapPin, Calendar, Clock, Map as MapIcon, List as ListIcon, Trash2, CalendarX, Settings, Camera, Thermometer, Navigation, Share, Globe, Sun, Cloud, CloudSun, CloudRain, Snowflake, Edit } from "lucide-react";
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
 const { trips, addActivity, addDayToTrip, deleteDayFromTrip, updateTripSettings, updateDayCoverImage, updateDayLocation } = useTripStore();
 
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

 // 🔥 天氣 API (加入防呆)
 useEffect(() => {
 const fetchWeather = async () => {
 if (!trip || trip.dailyItinerary.length === 0) return;

 const startDate = trip.dailyItinerary[0].date;
 const endDate = trip.dailyItinerary[trip.dailyItinerary.length - 1].date;
 const daysUntilTrip = differenceInDays(parseISO(startDate), new Date());

 // 如果行程太遠 (超過 15 日) 或已過去，就用 Dummy Data
 if (daysUntilTrip > 15 || daysUntilTrip < -trip.dailyItinerary.length) {
 const dummyMap: any = {};
 trip.dailyItinerary.forEach(day => {
 dummyMap[day.date] = { temp: "15°/25°", code: 1 }; // 預設晴天
 });
 setWeatherMap(dummyMap);
 return;
 }

 const lat = 34.69; const lng = 135.50; // 預設大阪
 try {
 const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${startDate}&end_date=${endDate}`);
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

 if (!isMounted || !trip) return <div className="p-10 text-center animate-pulse text-gray-400">載入中...</div>;

 const currentDailyItinerary = trip.dailyItinerary[activeDay];
 const displayLocation = currentDailyItinerary?.customLocation || (currentDailyItinerary?.activities && currentDailyItinerary.activities.length > 0 ? currentDailyItinerary.activities[0].location.split(' ')[0] : "自由探索");

 const handleEditLocation = () => {
 const newLoc = prompt("修改當日地點名稱:", displayLocation);
 if (newLoc) updateDayLocation(trip.id, activeDay, newLoc);
 };

 const handleAddActivity = (data: any) => { addActivity(trip.id, activeDay, data); setIsModalOpen(false); };
 const handleDeleteDay = () => { if (trip.dailyItinerary.length <= 1) { alert("最少保留一天！"); return; } if (confirm(`確定要刪除 Day ${activeDay + 1} 嗎？`)) { deleteDayFromTrip(trip.id, activeDay); } };
 const handleSaveSettings = () => { updateTripSettings(trip.id, editTitle, editStartDate, trip.coverImage || ""); setIsSettingsOpen(false); };
 const handleShare = async () => {
 const url = `${window.location.origin}/share/${trip.id}`;
 if (navigator.share) {
 try {
 await navigator.share({ title: trip.title, text: `查看我的行程：${trip.title}`, url });
 return;
 } catch (_) {}
 }
 // Fallback: WhatsApp share sheet
 const waUrl = `https://wa.me/?text=${encodeURIComponent(trip.title + '\n' + url)}`;
 window.open(waUrl, '_blank');
 };
 const handleOpenDayRoute = () => { if (!currentDailyItinerary || currentDailyItinerary.activities.length < 2) { alert("請至少安排兩個地點"); return; } const acts = currentDailyItinerary.activities.filter(a => a && (a.address || a.location)); const origin = acts[0].lat ? `${acts[0].lat},${acts[0].lng}` : encodeURIComponent(acts[0].address || acts[0].location); const destination = acts[acts.length - 1].lat ? `${acts[acts.length - 1].lat},${acts[acts.length - 1].lng}` : encodeURIComponent(acts[acts.length - 1].address || acts[acts.length - 1].location); const waypoints = acts.slice(1, -1).map(a => a.lat ? `${a.lat},${a.lng}` : encodeURIComponent(a.address || a.location)).join('|'); window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=transit`, '_blank'); };
 
 const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0]; if (!file) return;
 const filePath = `public/${trip.id}/day-covers/${activeDay}-${uuidv4()}`;
 const { error } = await supabase.storage.from('trip_files').upload(filePath, file);
 if (!error) { const { data: { publicUrl } } = supabase.storage.from('trip_files').getPublicUrl(filePath); updateDayCoverImage(trip.id, activeDay, publicUrl); }
 };

 const WeatherIcon = ({ code }: { code?: number }) => {
 // 🔥 全部改為黑白灰
 if (code === undefined) return <Cloud size={12} className="text-gray-400" />;
 if (code <= 1) return <Sun size={12} className="text-gray-500" />; // 晴天
 if (code <= 3) return <CloudSun size={12} className="text-gray-500" />; // 多雲
 if (code >= 51 && code <= 67) return <CloudRain size={12} className="text-gray-500" />; // 雨天
 if (code >= 71) return <Snowflake size={12} className="text-gray-500" />; // 雪天
 return <Cloud size={12} className="text-gray-400" />; // 陰天
 };

 return (
 <div className="flex flex-col md:flex-row h-screen bg-white font-sans text-[#333333] overflow-hidden">
 <Sidebar />
 <main className="flex-1 flex flex-col md:flex-row h-full ml-0 md:ml-64 relative overflow-hidden">
 
 {/* Mobile Header */}
 <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-100 bg-white shrink-0 z-40">
 <Link href="/" className="p-1"><ArrowLeft size={22} className="text-gray-400"/></Link>
 <h1 className="font-bold text-sm tracking-widest uppercase truncate flex-1 text-center px-4">{trip.title}</h1>
 <button onClick={() => setIsModalOpen(true)} className="bg-black text-white p-2 shadow-sm active:scale-95 transition-transform"><Plus size={20}/></button>
 </div>

 {/* Desktop Sidebar (Day List) */}
 <div className="hidden md:flex w-72 border-r border-gray-100 bg-white h-full overflow-y-auto flex-col shrink-0 z-20 pt-10">
 <div className="px-8 pb-8 border-b border-gray-50 sticky top-0 bg-white z-10">
 <Link href="/" className="flex items-center gap-2 text-[10px] text-gray-300 hover:text-black mb-6 transition-colors tracking-widest uppercase font-medium"><ArrowLeft size={10}/> BACK</Link>
 <div className="group cursor-pointer" onClick={()=>setIsSettingsOpen(true)}>
 <h2 className="text-lg font-bold leading-snug mb-1 text-black tracking-tight">{trip.title}</h2>
 <p className="text-[9px] text-gray-400 tracking-[0.2em] uppercase">{trip.startDate}</p>
 </div>
 </div>
 <div className="flex-1 py-4">
 {trip.dailyItinerary.map((dayItem, index) => {
 const info = weatherMap[dayItem.date];
 return (
 <button key={dayItem.day} onClick={() => setActiveDay(index)} className={`w-full text-left py-6 px-8 transition-all duration-300 group relative border-b border-gray-50 last:border-0 ${activeDay === index ? "bg-gray-50" : "hover:bg-gray-50"}`}>
 <div className="flex justify-between items-center relative z-10">
 <span className={clsx("text-xs tracking-[0.15em] uppercase", activeDay === index ? "font-semibold text-black" : "font-light text-gray-400")}>Day {dayItem.day}</span>
 <span className="text-[9px] text-gray-400 font-medium uppercase">{format(parseISO(dayItem.date), 'EEE')}</span>
 </div>
 <div className="text-[9px] mt-1 text-gray-500 font-light">{dayItem.date}</div>
 <div className="mt-2 flex items-center gap-2 text-[9px] text-gray-400">
 <WeatherIcon code={info?.code} />
 <span>{info ? info.temp : "15°/25°"}</span>
 </div>
 {activeDay === index && <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-black" />}
 </button>
 )
 })}
 <button onClick={() => addDayToTrip(trip.id)} className="w-full py-6 text-[10px] text-gray-300 hover:text-black flex items-center justify-center gap-2 uppercase tracking-[0.2em] transition-colors"><Plus size={12}/> Add Day</button>
 </div>
 </div>

 {/* Mobile Day Picker Slider */}
 <div className="md:hidden w-full bg-white border-b border-gray-100 z-30 shrink-0 shadow-sm overflow-hidden">
 <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar py-4 px-4 gap-3 items-center">
 {trip.dailyItinerary.map((dayItem, index) => {
 const info = weatherMap[dayItem.date];
 return (
 <button key={dayItem.day} onClick={() => setActiveDay(index)} className={clsx(
 "flex-shrink-0 snap-center flex flex-col items-center justify-center w-20 h-24 border transition-all duration-300 ", 
 activeDay === index ? "bg-black text-white border-black shadow-lg scale-105" : "bg-white text-gray-400 border-gray-100"
 )}>
 <span className="text-[9px] font-bold uppercase tracking-widest">{format(parseISO(dayItem.date), 'EEE')}</span>
 <span className="text-xl font-bold leading-none my-1">{format(parseISO(dayItem.date), 'd')}</span>
 {/* 🔥 顯示天氣 */}
 <div className="flex flex-col items-center gap-1 border-t border-current/10 pt-2 w-full mt-1">
 <WeatherIcon code={info?.code} />
 <span className="text-[8px] font-bold">{info ? info.temp : "15°/25°"}</span>
 </div>
 </button>
 )
 })}
 <button onClick={() => addDayToTrip(trip.id)} className="flex-shrink-0 flex items-center justify-center w-12 h-24 border border-dashed border-gray-200 text-gray-300 snap-center"><Plus size={20}/></button>
 </div>
 </div>

 {/* Main Content */}
 <div className="flex-1 relative overflow-y-auto bg-white scroll-smooth h-full no-scrollbar pb-32"> 
 <div className="h-44 md:h-80 relative w-full shrink-0 group">
 <Image src={currentDailyItinerary?.coverImage || trip.coverImage || ""} alt="Cover" fill className="object-cover object-center" priority />
 <div className="absolute bottom-0 left-0 right-0 px-6 md:px-16 pb-6 pt-20">
 <div className="animate-fade-in-up">
 <h3 className="text-4xl md:text-7xl font-bold tracking-tight uppercase leading-none text-black drop-shadow-[0_2px_15px_rgba(255,255,255,0.8)]">Day {activeDay + 1}</h3>
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
 <button onClick={handleShare} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest border border-gray-200 text-gray-500 py-2.5 bg-white uppercase hover:border-black transition-all whitespace-nowrap px-5"><Share size={14} /> <span className="hidden sm:inline">分享</span></button>
 <button onClick={handleOpenDayRoute} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest border border-gray-200 text-gray-500 py-2.5 bg-white uppercase hover:border-black transition-all whitespace-nowrap px-5"><Navigation size={14} /> <span className="hidden sm:inline">路線</span></button>
 {/* Full Map View - 全程地圖 */}
 <Link
 href={`/planner/${trip.id}/map`}
 className="flex-1 md:flex-none flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest border border-gray-200 text-gray-500 py-2.5 bg-white uppercase hover:border-black transition-all whitespace-nowrap px-5"
 >
 <Globe size={14} />
 <span className="hidden sm:inline">全程地圖</span>
 </Link><button onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest border border-gray-200 text-gray-500 py-2.5 bg-white uppercase hover:border-black transition-all whitespace-nowrap px-5">{viewMode === 'list' ? <><MapIcon size={14} /> <span className="hidden sm:inline">地圖</span></> : <><ListIcon size={14} /> <span className="hidden sm:inline">列表</span></>}</button>
 <button onClick={() => setIsModalOpen(true)} className="hidden md:flex flex-none items-center gap-2 text-[10px] tracking-widest bg-black text-white px-6 py-2.5 hover:bg-gray-800 transition-colors shadow-lg uppercase font-bold"><Plus size={12} /> 新增活動</button>
 
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
 <AddActivityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddActivity} tripId={trip.id} destLat={trip.destLat} destLng={trip.destLng} />
 {selectedActivityId && <ActivityDetailModal tripId={trip.id} dayIndex={activeDay} activityId={selectedActivityId} onClose={() => setSelectedActivityId(null)} />}
 {isSettingsOpen && <EditTripModal trip={trip} onClose={()=>setIsSettingsOpen(false)} />}
 </div>
 </main>
 </div>
 );
}=== ./app/planner/page.tsx ===
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTripStore } from "@/store/useTripStore";

export default function PlannerRedirect() {
 const router = useRouter();
 const { trips, activeTripId, isSyncing } = useTripStore();

 useEffect(() => {
 if (isSyncing) return; // 等待同步完成

 if (activeTripId) {
 router.push(`/planner/${activeTripId}`);
 } else if (trips.length > 0) {
 router.push(`/planner/${trips[0].id}`);
 } else {
 // 如果真的沒有旅程，留在這或者去首頁
 // router.push("/"); 
 }
 }, [trips, activeTripId, isSyncing, router]);

 return (
 <div className="flex min-h-screen items-center justify-center bg-white text-gray-400 text-xs tracking-widest uppercase animate-pulse">
 Loading Planner...
 </div>
 );
}=== ./app/planning/page.tsx ===
"use client";
import { useState, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TripSwitcher from "@/components/layout/TripSwitcher";
import { useTripStore, Priority, PlanItem } from "@/store/useTripStore";
import { CheckCircle2, Circle, Image as ImageIcon, Trash2, Upload, X, Edit, GripVertical } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/lib/supabase";
import clsx from "clsx";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ConfirmDialog } from "@/components/ui/Dialog";
import PlacesToVisit from "@/components/planner/PlacesToVisit";

// 可拖曳的 Item 組件
const SortablePlanItem = ({ item, trip, onEdit, onDeleteRequest }: { item: PlanItem, trip: any, onEdit: (item: PlanItem)=>void, onDeleteRequest: (id: string) => void }) => {
 const { attributes, listeners, setNodeRef, transform, transition } = useSortable({id: item.id});
 const style = { transform: CSS.Transform.toString(transform), transition };

 const { togglePlanItem } = useTripStore();
 const assigned = trip.members.find((m: any) => m.id === item.assigneeId);
 const priorityColor = { High: "border border-neutral-800 text-neutral-800", Medium: "border border-neutral-400 text-neutral-500", Low: "border border-neutral-300 text-neutral-400" };

 return (
 <div ref={setNodeRef} style={style} className={clsx("p-4 border bg-white hover:shadow-md transition-shadow relative group rounded-none flex items-start gap-4", item.isCompleted && "opacity-50")}>
 <div className="flex-1 flex items-start gap-4">
 <button onClick={() => togglePlanItem(trip.id, item.id)} className={clsx("mt-1", item.isCompleted ? "text-gray-400" : "text-black")}>
 {item.isCompleted ? <CheckCircle2 size={20}/> : <Circle size={20}/>}
 </button>
 <div className="flex-1">
 <p className={clsx("font-medium", item.isCompleted && "line-through text-gray-400")}>{item.text}</p>
 <div className="flex items-center gap-4 mt-2">
 <span className={`text-[9px] uppercase font-semibold tracking-widest px-2 py-0.5 rounded-sm ${priorityColor[item.priority]}`}>{item.priority}</span>
 {item.location && <p className="text-xs text-gray-400">📍 {item.location}</p>}
 </div>
 {assigned && (
 <div className="mt-2 flex items-center gap-2 bg-gray-50 p-1 rounded-full w-fit pr-2 border border-gray-100">
 <img src={assigned.avatar} className="w-5 h-5 rounded-full object-cover"/>
 <span className="text-[10px] text-gray-500">{assigned.name}</span>
 </div>
 )}
 </div>
 </div>
 {item.imageUrl && <img src={item.imageUrl} className="w-20 h-20 rounded-none object-contain bg-white border border-gray-100 p-1"/>}
 <div className="absolute top-4 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <button onClick={() => onEdit(item)} className="p-1 text-gray-400 hover:text-black"><Edit size={14}/></button>
 <button onClick={() => onDeleteRequest(item.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
 </div>
 <div {...attributes} {...listeners} className="absolute inset-y-0 right-10 flex items-center px-2 cursor-grab touch-none text-gray-300">
 <GripVertical size={16} />
 </div>
 </div>
 );
};

export default function PlanningPage() {
 const { trips, activeTripId, addPlanItem, updatePlanItem, deletePlanItem, updatePlanOrder } = useTripStore();
 const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
 const trip = activeTripId ? trips.find(t => t.id === activeTripId) : (trips.length > 0 ? trips[0] : null);
 
 const [activeTab, setActiveTab] = useState("Packing");
 const [editingItemId, setEditingItemId] = useState<string | null>(null);
 const [text, setText] = useState("");
 const [priority, setPriority] = useState<Priority>("Medium");
 const [location, setLocation] = useState("");
 const [estimatedCost, setEstimatedCost] = useState("");
 const [assignee, setAssignee] = useState("");
 const [imageUrl, setImageUrl] = useState("");
 const [isUploading, setIsUploading] = useState(false);

 // By default, sort by priority
 const currentItems = useMemo(() => {
 if (!trip) return [];
 const priorityOrder = { High: 1, Medium: 2, Low: 3 };
 return trip.plans.filter(p => p.category === activeTab)
 .sort((a,b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
 }, [trip, activeTab]);

 // DND setup
 const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
 const handleDragEnd = (event: any) => {
 const {active, over} = event;
 if (active.id !== over.id) {
 const oldIndex = trip!.plans.findIndex(p => p.id === active.id);
 const newIndex = trip!.plans.findIndex(p => p.id === over.id);
 const newOrderedPlans = arrayMove(trip!.plans, oldIndex, newIndex);
 updatePlanOrder(trip!.id, newOrderedPlans);
 }
 };

 if (!trip) return <div className="p-12 text-center text-gray-400 text-xs tracking-widest animate-pulse">載入中...</div>;
 const tabNames: Record<string, string> = { Packing: "行李清單", Todo: "待辦事項", Shopping: "購物清單", Places: "景點清單" };

 const handleEdit = (item: PlanItem) => { setEditingItemId(item.id); setText(item.text); setPriority(item.priority); setLocation(item.location || ""); setEstimatedCost(item.estimatedCost ? item.estimatedCost.toString() : ""); setAssignee(item.assigneeId || ""); setImageUrl(item.imageUrl || ""); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); };
 const handleCancelEdit = () => { setEditingItemId(null); setText(""); setLocation(""); setEstimatedCost(""); setAssignee(""); setImageUrl(""); };

 const handleSave = () => {
 if(!text) return;
 const itemData = { category: activeTab as any, text, priority, location, estimatedCost: activeTab==='Shopping' ? Number(estimatedCost) : undefined, assigneeId: assignee, imageUrl };
 if (editingItemId) { updatePlanItem(trip.id, editingItemId, itemData); setEditingItemId(null); } 
 else { addPlanItem(trip.id, { ...itemData, id: uuidv4(), isCompleted: false }); }
 setText(""); setLocation(""); setEstimatedCost(""); setAssignee(""); setImageUrl("");
 };

 const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0]; if (!file) return; setIsUploading(true);
 try { const filePath = `public/${trip.id}/planning/${uuidv4()}-${file.name}`; const { error } = await supabase.storage.from('trip_files').upload(filePath, file); if (error) throw error; const { data: { publicUrl } } = supabase.storage.from('trip_files').getPublicUrl(filePath); setImageUrl(publicUrl); } catch (error: any) { console.error("上傳失敗:", error.message); } finally { setIsUploading(false); }
 };

 return (
 <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
 <Sidebar />
 <main className="flex-1 ml-0 md:ml-64 p-8 md:p-12 pb-24">
 <header className="mb-10"><h1 className="text-3xl font-serif font-bold tracking-widest uppercase mb-2">行前準備</h1><div className="flex items-center gap-4"><TripSwitcher /></div></header>
 <div className="flex gap-4 md:gap-8 border-b border-gray-100 mb-8 overflow-x-auto no-scrollbar">
 {['Packing','Todo','Shopping','Places'].map(t => (<button key={t} onClick={()=>{setActiveTab(t); handleCancelEdit();}} className={`pb-4 text-xs font-bold tracking-[0.2em] uppercase whitespace-nowrap ${activeTab===t?'border-b-2 border-black':'text-gray-300'}`}>{tabNames[t]}</button>))}
 </div>

 {activeTab === 'Places' ? (
 <PlacesToVisit trip={trip} />
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Draggable List */}
 <div className="md:col-span-1 space-y-3">
 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
 <SortableContext items={currentItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
 {currentItems.map(item => (
 <SortablePlanItem key={item.id} item={item} trip={trip} onEdit={handleEdit} onDeleteRequest={(id) => setDeletingPlanId(id)} />
 ))}
 </SortableContext>
 </DndContext>
 </div>
 
 {/* Add/Edit Form */}
 <div className={clsx("border border-dashed p-6 bg-gray-50 rounded-none h-fit sticky top-10", editingItemId ? "border-black bg-white" : "border-gray-300")}>
 <div className="flex justify-between items-center mb-4"><span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{editingItemId ? "編輯項目" : "新增項目"}</span>{editingItemId && <button onClick={handleCancelEdit}><X size={14} className="text-gray-400 hover:text-black"/></button>}</div>
 <input value={text} onChange={e=>setText(e.target.value)} placeholder="項目名稱..." className="w-full bg-transparent border-b mb-3 text-sm p-1 focus:border-black outline-none"/>
 {activeTab === 'Shopping' && (<><input value={location} onChange={e=>setLocation(e.target.value)} placeholder="購買地點..." className="w-full bg-transparent border-b mb-3 text-sm p-1 focus:border-black outline-none"/><input type="number" value={estimatedCost} onChange={e=>setEstimatedCost(e.target.value)} placeholder="預算 (¥)..." className="w-full bg-transparent border-b mb-3 text-sm p-1 focus:border-black outline-none"/><div className="mb-3">{imageUrl ? (<div className="relative w-full h-24 rounded overflow-hidden group"><img src={imageUrl} className="w-full h-full object-cover" /><button onClick={()=>setImageUrl("")} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full"><X size={12}/></button></div>) : (<label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-black transition-colors border border-dashed border-gray-300 p-3 rounded justify-center bg-white">{isUploading ? "上傳中..." : <><ImageIcon size={14}/> 上傳圖片</>}<input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} /></label>)}</div></>)}
 <div className="flex gap-2 mb-3">{['High','Medium','Low'].map(p=>(<button key={p} onClick={()=>setPriority(p as any)} className={`text-[10px] border px-2 py-1 rounded ${priority===p?'bg-black text-white':'bg-white text-gray-400'}`}>{p}</button>))}</div>
 <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar"><span className="text-[10px] text-gray-400 flex items-center shrink-0">指派:</span>{trip.members.map(m => (<button key={m.id} onClick={()=>setAssignee(m.id === assignee ? "" : m.id)} className={`w-6 h-6 rounded-full border shrink-0 overflow-hidden ${assignee===m.id ? 'border-black scale-110' : 'border-transparent opacity-50'}`}><img src={m.avatar} className="w-full h-full object-cover"/></button>))}</div>
 <button onClick={handleSave} className="w-full bg-jp-charcoal text-white py-2 text-xs uppercase tracking-widest hover:bg-black rounded transition-colors">{editingItemId ? "更新" : "新增"}</button>
 </div>
 </div>
 )}
 </main>

 <ConfirmDialog
 isOpen={!!deletingPlanId}
 title="刪除項目"
 message="確定要刪除這個項目嗎？"
 confirmLabel="刪除" cancelLabel="取消" danger
 onConfirm={() => { if (deletingPlanId) deletePlanItem(trip.id, deletingPlanId); setDeletingPlanId(null); }}
 onCancel={() => setDeletingPlanId(null)}
 />
 </div>
 );
}=== ./app/layout.tsx ===
"use client";
import { useEffect, useMemo, useState } from "react";
import { Inter, Noto_Sans_JP } from "next/font/google";
import MobileNav from "@/components/layout/MobileNav";
import { useTripStore } from "@/store/useTripStore";
import { supabase } from "@/lib/supabase";
import "./globals.css";
import { useJsApiLoader, Libraries } from "@react-google-maps/api";
import { WifiOff } from "lucide-react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSansJP = Noto_Sans_JP({ subsets: ["latin"], weight: ["300", "400", "500", "700"], variable: "--font-noto-sans" });

const LIBRARIES: Libraries = ["places", "marker", "geometry", "routes"];

function OfflineBanner() {
 const [isOnline, setIsOnline] = useState(true);
 const [showBanner, setShowBanner] = useState(false);

 useEffect(() => {
 const handleOnline = () => { setIsOnline(true); setTimeout(() => setShowBanner(false), 2000); };
 const handleOffline = () => { setIsOnline(false); setShowBanner(true); };
 window.addEventListener("online", handleOnline);
 window.addEventListener("offline", handleOffline);
 if (!navigator.onLine) handleOffline();
 return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
 }, []);

 if (!showBanner) return null;

 return (
 <div className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2 text-xs font-medium tracking-wider transition-colors duration-500 ${isOnline ? "bg-green-600 text-white" : "bg-neutral-900 text-white"}`}>
 {isOnline ? "✓ 已恢復連線" : <><WifiOff size={12} /> 離線模式 — 顯示上次緩存資料</>}
 </div>
 );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
 const { loadTripsFromCloud, isSyncing } = useTripStore();
 
 // 🔥 全站唯一載入點
 const { isLoaded, loadError } = useJsApiLoader({
 id: 'google-map-script',
 googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
 libraries: LIBRARIES,
 });

 useEffect(() => {
 loadTripsFromCloud();
 }, [loadTripsFromCloud]);

 return (
 <html lang="zh-TW">
 <head>
 <title>VM&apos;s Build</title>
 <link rel="manifest" href="/manifest.json" />
 <link rel="icon" href="/icon-192.png" />
 <link rel="apple-touch-icon" href="/icon-192.png" />
 <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
 <meta name="theme-color" content="#1a1a1a" />
 <meta name="apple-mobile-web-app-capable" content="yes" />
 <meta name="apple-mobile-web-app-status-bar-style" content="default" />
 <meta name="apple-mobile-web-app-title" content="VM手帳" />
 </head>
 <body className={`${inter.variable} ${notoSansJP.variable} font-sans bg-white text-[#333333] antialiased font-light`}>
 {isSyncing && <div className="fixed top-0 left-0 right-0 h-1 bg-blue-500 z-[9999] animate-pulse" />}
 <OfflineBanner />
 
 {/* 只有地圖服務載入成功，才顯示內容，徹底解決不同步報錯 */}
 {isLoaded ? (
 <div className="pb-24 md:pb-0">
 {children}
 </div>
 ) : (
 <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
 <div className="relative flex flex-col items-center gap-8">
 {/* Animated plane */}
 <div className="relative w-64 h-16 flex items-center">
 {/* Runway / dotted trail */}
 <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex gap-2 items-center">
 {[...Array(8)].map((_, i) => (
 <div
 key={i}
 className="h-px flex-1 bg-gray-200"
 style={{ animationDelay: `${i * 0.1}s` }}
 />
 ))}
 </div>
 {/* Plane emoji flying across */}
 <div
 className="absolute text-2xl"
 style={{
 animation: "flyAcross 2s ease-in-out infinite",
 }}
 >
 ✈️
 </div>
 </div>

 {/* Text */}
 <div className="text-center">
 <p className="text-[9px] tracking-[0.35em] text-gray-400 uppercase">
 {loadError ? "地圖服務載入失敗" : "正在起飛中..."}
 </p>
 </div>
 </div>

 {/* Inline keyframes */}
 <style>{`
 @keyframes flyAcross {
 0% { left: -8px; opacity: 0; transform: translateY(4px); }
 15% { opacity: 1; }
 85% { opacity: 1; }
 100% { left: calc(100% - 8px); opacity: 0; transform: translateY(-4px); }
 }
 `}</style>
 </div>
 )}
 
 <MobileNav />
 </body>
 </html>
 );
}=== ./app/toolbox/page.tsx ===
"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TripSwitcher from "@/components/layout/TripSwitcher";
import { RefreshCw, ArrowRightLeft, Download, Upload, Save, AlertTriangle, Loader2, CheckCircle2, Wifi, WifiOff, HardDrive, Signal } from "lucide-react";
import { useTripStore } from "@/store/useTripStore";

const POPULAR_CURRENCIES = ["JPY", "HKD", "USD", "TWD", "KRW", "SGD", "GBP", "EUR", "THB", "MYR", "AUD"];

export default function ToolboxPage() {
 const { trips, activeTripId, importData, updateTripRate } = useTripStore();
 const trip = activeTripId ? trips.find(t => t.id === activeTripId) : trips[0];

 const [amount, setAmount] = useState<string>("");
 const [rate, setRate] = useState(0.052);
 const [currencyFrom, setCurrencyFrom] = useState(trip?.localCurrency || "HKD");
 const [currencyTo, setCurrencyTo] = useState("HKD");
 const [isFetching, setIsFetching] = useState(false);
 const [lastUpdated, setLastUpdated] = useState<string | null>(null);
 const [fetchError, setFetchError] = useState(false);
 const [importStatus, setImportStatus] = useState("");
 const [cacheStatus, setCacheStatus] = useState<"idle" | "caching" | "done" | "error">("idle");
 const [cacheProgress, setCacheProgress] = useState(0);

 useEffect(() => {
 if (trip?.exchangeRate) setRate(trip.exchangeRate);
 if (trip?.localCurrency) setCurrencyFrom(trip.localCurrency);
 }, [trip?.id]);

 const handleRateChange = (newRate: number) => {
 setRate(newRate);
 if (trip) updateTripRate(trip.id, newRate);
 };

 const fetchLiveRate = async () => {
 setIsFetching(true);
 setFetchError(false);
 try {
 const res = await fetch("https://open.er-api.com/v6/latest/" + currencyFrom);
 const data = await res.json();
 if (data.result === "success" && data.rates[currencyTo]) {
 handleRateChange(parseFloat(data.rates[currencyTo].toFixed(6)));
 const now = new Date();
 const hh = now.getHours().toString().padStart(2, "0");
 const mm = now.getMinutes().toString().padStart(2, "0");
 setLastUpdated(hh + ":" + mm);
 } else {
 setFetchError(true);
 }
 } catch (_e) {
 setFetchError(true);
 } finally {
 setIsFetching(false);
 }
 };

 const handleSwap = () => {
 const newFrom = currencyTo;
 const newTo = currencyFrom;
 const newRate = rate !== 0 ? parseFloat((1 / rate).toFixed(6)) : rate;
 setCurrencyFrom(newFrom);
 setCurrencyTo(newTo);
 setRate(newRate);
 handleRateChange(newRate);
 setLastUpdated(null);
 };

 const handlePrecacheAll = async () => {
 setCacheStatus("caching");
 setCacheProgress(0);
 const routes = ["/", "/bookings", "/planner", "/budget", "/planning", "/toolbox", "/members"];
 if (trip) {
 trip.dailyItinerary.forEach((_d, i) => routes.push("/planner/" + trip.id + "?day=" + i));
 }
 try {
 const cache = await caches.open("app-manual-cache-v1");
 let done = 0;
 for (const route of routes) {
 try {
 await cache.add(route);
 } catch (_e) {
 // Some routes may fail, continue
 }
 done++;
 setCacheProgress(Math.round((done / routes.length) * 100));
 }
 if (trip) {
 const images = trip.dailyItinerary
 .map((d) => d.coverImage)
 .filter((img): img is string => Boolean(img));
 for (const img of images) {
 try {
 await cache.add(img);
 } catch (_e) {
 // Image cache failure is non-critical
 }
 }
 }
 setCacheStatus("done");
 setTimeout(() => {
 setCacheStatus("idle");
 setCacheProgress(0);
 }, 3000);
 } catch (_e) {
 setCacheStatus("error");
 setTimeout(() => setCacheStatus("idle"), 3000);
 }
 };

 const handleExport = () => {
 const dataStr = JSON.stringify(trips, null, 2);
 const blob = new Blob([dataStr], { type: "application/json" });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = "vm-build-backup-" + new Date().toISOString().slice(0, 10) + ".json";
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
 };

 const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 const reader = new FileReader();
 reader.onload = (event) => {
 try {
 const json = JSON.parse(event.target?.result as string);
 if (Array.isArray(json)) {
 importData(json);
 setImportStatus("匯入成功！");
 } else {
 setImportStatus("格式錯誤");
 }
 } catch (_e) {
 setImportStatus("匯入失敗");
 }
 };
 reader.readAsText(file);
 };

 const result = amount ? (parseFloat(amount) * rate).toFixed(2) : "0";

 return (
 <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
 <Sidebar />
 <main className="flex-1 ml-0 md:ml-64 p-8 md:p-12 overflow-y-auto h-screen bg-gray-50 pb-24">
 <header className="mb-10">
 <h1 className="text-3xl font-serif font-bold tracking-widest uppercase mb-2">旅行工具</h1>
 <div className="flex items-center gap-4">
 <TripSwitcher />
 </div>
 </header>

 <div className="grid grid-cols-1 gap-12 max-w-4xl">

 {/* ── 匯率計算機 ── */}
 <div className="space-y-4">
 <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
 <RefreshCw size={16} />
 <h2 className="text-xs font-bold tracking-[0.2em] uppercase">匯率計算機</h2>
 </div>
 <div className="bg-white p-8 border border-gray-100 space-y-6">

 {/* Currency pair */}
 <div className="flex gap-4 items-end">
 <div className="flex-1">
 <label className="text-[9px] text-gray-400 block mb-1 tracking-widest uppercase">From</label>
 <input
 value={currencyFrom}
 onChange={(e) => { setCurrencyFrom(e.target.value.toUpperCase()); setLastUpdated(null); }}
 className="w-full border-b text-2xl font-black p-1 uppercase focus:outline-none focus:border-black"
 />
 </div>
 <button onClick={handleSwap} className="text-gray-300 mb-2 hover:text-black transition-colors">
 <ArrowRightLeft size={20} />
 </button>
 <div className="flex-1">
 <label className="text-[9px] text-gray-400 block mb-1 tracking-widest uppercase">To</label>
 <input
 value={currencyTo}
 onChange={(e) => { setCurrencyTo(e.target.value.toUpperCase()); setLastUpdated(null); }}
 className="w-full border-b text-2xl font-black p-1 uppercase focus:outline-none focus:border-black"
 />
 </div>
 </div>

 {/* Quick currency buttons */}
 <div className="flex flex-wrap gap-1.5">
 {POPULAR_CURRENCIES.filter((c) => c !== currencyFrom).map((c) => (
 <button
 key={c}
 onClick={() => { setCurrencyTo(c); setLastUpdated(null); }}
 className={"text-[9px] font-bold px-2 py-1 border tracking-widest uppercase transition-colors " + (currencyTo === c ? "bg-black text-white border-black" : "border-gray-200 text-gray-400 hover:border-black hover:text-black")}
 >
 {c}
 </button>
 ))}
 </div>

 {/* Rate row */}
 <div>
 <div className="flex justify-between items-center mb-2">
 <span className="text-[9px] text-gray-400 tracking-widest uppercase">
 1 {currencyFrom} = ? {currencyTo}
 </span>
 <div className="flex items-center gap-2">
 {lastUpdated && !fetchError && (
 <span className="text-[9px] text-gray-400 flex items-center gap-1">
 <CheckCircle2 size={10} className="text-green-500" /> 即時匯率 {lastUpdated}
 </span>
 )}
 {fetchError && (
 <span className="text-[9px] text-red-400 flex items-center gap-1">
 <WifiOff size={10} /> 網絡錯誤
 </span>
 )}
 <button
 onClick={fetchLiveRate}
 disabled={isFetching}
 className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase border border-gray-200 px-3 py-1.5 hover:border-black hover:text-black transition-colors disabled:opacity-50"
 >
 {isFetching ? <Loader2 size={10} className="animate-spin" /> : <Wifi size={10} />}
 {isFetching ? "抓取中..." : "即時匯率"}
 </button>
 </div>
 </div>
 <input
 type="number"
 value={rate}
 onChange={(e) => { handleRateChange(parseFloat(e.target.value)); setLastUpdated(null); }}
 className="w-full border border-gray-200 p-3 text-lg font-mono focus:outline-none focus:border-black"
 />
 </div>

 {/* Amount converter */}
 <div className="bg-gray-50 p-6 text-center border border-gray-100">
 <input
 type="number"
 value={amount}
 onChange={(e) => setAmount(e.target.value)}
 placeholder="輸入金額..."
 className="w-full bg-transparent text-center text-4xl font-bold mb-1 outline-none placeholder-gray-300"
 />
 <p className="text-[10px] text-gray-400 mb-4 tracking-widest">{currencyFrom}</p>
 <div className="h-[1px] w-10 bg-gray-300 mx-auto mb-4" />
 <p className="text-5xl font-serif font-black">{result}</p>
 <p className="text-[10px] text-gray-400 mt-2 tracking-widest">{currencyTo}</p>
 </div>
 </div>
 </div>

 {/* ── 離線緩存 ── */}
 <div className="space-y-4">
 <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
 <HardDrive size={16} />
 <h2 className="text-xs font-bold tracking-[0.2em] uppercase">離線緩存</h2>
 </div>
 <div className="bg-white p-8 border border-gray-100 space-y-5">
 <div className="flex items-start gap-4">
 <div className="flex-1">
 <p className="text-sm font-bold mb-1">一鍵下載離線版</p>
 <p className="text-xs text-gray-400 leading-relaxed">
 預先緩存所有頁面至本機 — 上機後開 Airplane Mode 照用。<br />
 行程資料存於本機，即使無網絡亦可查閱。
 </p>
 </div>
 <div className="flex items-center gap-1.5 text-[9px] text-gray-400 shrink-0">
 <Signal size={10} />
 <span className="tracking-widest uppercase">Offline Ready</span>
 </div>
 </div>

 {cacheStatus === "caching" && (
 <div className="space-y-2">
 <div className="flex justify-between text-[9px] text-gray-400 tracking-widest uppercase">
 <span>緩存中...</span>
 <span>{cacheProgress}%</span>
 </div>
 <div className="h-[2px] bg-gray-100 w-full">
 <div
 className="h-full bg-black transition-all duration-300"
 style={{ width: cacheProgress + "%" }}
 />
 </div>
 </div>
 )}

 {cacheStatus === "done" && (
 <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-100 px-4 py-3">
 <CheckCircle2 size={14} />
 <span className="font-bold tracking-widest uppercase">緩存完成 — 可安心開飛行模式</span>
 </div>
 )}

 {cacheStatus === "error" && (
 <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 border border-red-100 px-4 py-3">
 <WifiOff size={14} />
 <span className="font-bold tracking-widest uppercase">緩存失敗，請確保網絡正常後重試</span>
 </div>
 )}

 <button
 onClick={handlePrecacheAll}
 disabled={cacheStatus === "caching"}
 className="w-full flex items-center justify-center gap-2 border border-black bg-black text-white py-4 text-xs font-bold tracking-widest uppercase hover:opacity-80 transition-opacity disabled:opacity-50"
 >
 {cacheStatus === "caching" ? (
 <>
 <Loader2 size={14} className="animate-spin" />
 緩存中 {cacheProgress}%
 </>
 ) : (
 <>
 <HardDrive size={14} />
 立即緩存離線版
 </>
 )}
 </button>

 <p className="text-[9px] text-gray-300 tracking-widest text-center uppercase">
 建議每次出發前重新緩存以獲取最新資料
 </p>
 </div>
 </div>

 {/* ── 資料備份 ── */}
 <div className="space-y-4">
 <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
 <Save size={16} />
 <h2 className="text-xs font-bold tracking-[0.2em] uppercase">資料備份</h2>
 </div>
 <div className="bg-white p-8 border border-gray-100">
 <p className="text-sm text-gray-500 mb-6">將行程資料匯出備份，或匯入以恢復資料。</p>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <button
 onClick={handleExport}
 className="flex items-center justify-center gap-2 border border-black bg-black text-white py-4 text-xs font-bold tracking-widest uppercase hover:opacity-80 transition-opacity"
 >
 <Download size={16} /> 匯出資料
 </button>
 <label className="flex items-center justify-center gap-2 border border-gray-300 py-4 text-xs font-bold tracking-widest uppercase hover:bg-gray-50 cursor-pointer transition-colors">
 <Upload size={16} /> 匯入資料
 <input type="file" accept=".json" onChange={handleImport} className="hidden" />
 </label>
 </div>
 {importStatus && (
 <div className="mt-4 p-3 bg-gray-50 text-xs text-center font-bold flex items-center justify-center gap-2 text-gray-600">
 <AlertTriangle size={14} /> {importStatus}
 </div>
 )}
 </div>
 </div>

 </div>
 </main>
 </div>
 );
}