"use client";
import Sidebar from "@/components/layout/Sidebar";
import EditTripModal from "@/components/dashboard/EditTripModal";
import { useTripStore } from "@/store/useTripStore";
import { Plus, Settings, Trash2, X, MapPin, Camera } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { differenceInDays, parseISO } from "date-fns";
import Link from "next/link";

// ── New Trip Modal ─────────────────────────────────────────────────────────
function NewTripModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (data: any) => void }) {
 const [title, setTitle] = useState("");
 const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
 const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
 const [destLabel, setDestLabel] = useState("");
 const [destLat, setDestLat] = useState<number|null>(null);
 const [destLng, setDestLng] = useState<number|null>(null);
 const [coverPreview, setCoverPreview] = useState<string>("");
 const [coverUrl, setCoverUrl] = useState<string>("");
 const [uploading, setUploading] = useState(false);
 const inputRef = useRef<HTMLInputElement>(null);
 const autoRef = useRef<any>(null);
 const fileRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
 const tryInit = () => {
 if (!inputRef.current || !(window as any).google?.maps?.places?.Autocomplete) return false;
 const auto = new (window as any).google.maps.places.Autocomplete(inputRef.current, { types: ["(cities)"] });
 autoRef.current = auto;
 auto.addListener("place_changed", () => {
 const place = auto.getPlace();
 const label = place.formatted_address || place.name || "";
 setDestLabel(label);
 setTitle(t => t || label.split(",")[0].trim());
 const loc = place.geometry?.location;
 if (loc) { setDestLat(loc.lat()); setDestLng(loc.lng()); }
 });
 return true;
 };
 if (!tryInit()) {
 const iv = setInterval(() => { if (tryInit()) clearInterval(iv); }, 500);
 return () => clearInterval(iv);
 }
 }, []);

 const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 setCoverPreview(URL.createObjectURL(file));
 setUploading(true);
 try {
 const { supabase } = await import("@/lib/supabase");
 const ext = file.name.split(".").pop();
 const path = `public/covers/${Date.now()}.${ext}`;
 const { error } = await supabase.storage.from("trip-media").upload(path, file, { upsert: true });
 if (!error) {
 const { data } = supabase.storage.from("trip-media").getPublicUrl(path);
 setCoverUrl(data.publicUrl);
 }
 } finally { setUploading(false); }
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!title) return;
 onConfirm({ title, startDate, endDate, destLabel, destLat, destLng, coverUrl });
 };

 return (
 <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <div className="bg-white w-full max-w-md shadow-2xl overflow-hidden">
 {/* Cover upload area */}
 <div
 className="relative w-full h-36 bg-gray-100 overflow-hidden cursor-pointer group"
 onClick={() => fileRef.current?.click()}
 >
 {coverPreview ? (
 <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
 ) : (
 <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-300 hover:text-gray-400 transition-colors">
 <Camera size={24} />
 <span className="text-[10px] tracking-widest uppercase">上傳封面圖片</span>
 <span className="text-[9px] text-gray-300">建議 1200×480px · JPG/PNG · max 5MB</span>
 </div>
 )}
 {coverPreview && (
 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
 <span className="text-white text-[10px] tracking-widest uppercase">更換封面</span>
 </div>
 )}
 {uploading && (
 <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
 <span className="text-white text-xs tracking-widest animate-pulse">上傳中...</span>
 </div>
 )}
 <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
 </div>

 <div className="p-8">
 <div className="flex justify-between items-center mb-6">
 <h2 className="text-xl font-bold tracking-widest uppercase">新增旅程</h2>
 <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-black"/></button>
 </div>
 <form onSubmit={handleSubmit} className="space-y-5">
 <div>
 <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">旅程名稱</label>
 <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="例：2026 台中之旅" className="w-full border-b py-2 text-sm focus:outline-none focus:border-black"/>
 </div>
 <div>
 <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">目的地 <span className="text-gray-300">(選填)</span></label>
 <div className="flex items-center border-b">
 <MapPin size={12} className="text-gray-300 mr-2 shrink-0"/>
 <input ref={inputRef} value={destLabel} onChange={e => setDestLabel(e.target.value)} placeholder="搜尋城市..." className="w-full py-2 text-sm focus:outline-none"/>
 {destLat && <span className="text-[10px] text-green-500 shrink-0">✓</span>}
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">出發日期</label>
 <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border-b py-2 text-sm focus:outline-none focus:border-black"/>
 </div>
 <div>
 <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">回程日期</label>
 <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border-b py-2 text-sm focus:outline-none focus:border-black"/>
 </div>
 </div>
 <button type="submit" disabled={!title || uploading} className="w-full bg-black text-white py-3 text-xs font-bold uppercase tracking-widest hover:opacity-80 transition-opacity disabled:opacity-40">
 {uploading ? "封面上傳中..." : "建立旅程"}
 </button>
 </form>
 </div>
 </div>
 </div>
 );
}
// ──────────────────────────────────────────────────────────────────────────

export default function Home() {
 const { trips, addTrip, deleteTrip, setActiveTrip } = useTripStore();
 const [isMounted, setIsMounted] = useState(false);
 const [editingTrip, setEditingTrip] = useState<any>(null);
 const [showNewTrip, setShowNewTrip] = useState(false);

 useEffect(() => setIsMounted(true), []);
 if (!isMounted) return <div className="p-10 animate-pulse text-center text-gray-400">Loading...</div>;

 const handleAddTrip = () => setShowNewTrip(true);

 const handleNewTripConfirm = (data: any) => {
 addTrip({
 title: data.title,
 startDate: data.startDate,
 endDate: data.endDate,
 status: "planning",
 coverImage: data.coverUrl || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2000&auto=format&fit=crop",
 destLat: data.destLat,
 destLng: data.destLng,
 destLabel: data.destLabel,
 });
 setShowNewTrip(false);
 };

 const handleDelete = (e: React.MouseEvent, id: string) => {
 e.stopPropagation();
 e.preventDefault();
 if(confirm("⚠️ 警告：確定要永久刪除此旅程嗎？")) deleteTrip(id);
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
 <button onClick={handleAddTrip} className="bg-jp-charcoal text-white px-6 py-3 flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-lg active:scale-95 text-xs tracking-widest uppercase">
 <Plus size={16} /> 新增旅程
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
 {trips.map((trip) => {
 const daysLeft = differenceInDays(parseISO(trip.startDate), new Date());
 
 // 🔥 修復崩潰：加入 (a => a) 過濾掉壞資料
 const totalActs = trip.dailyItinerary.reduce((acc, day) => acc + (day.activities?.filter(a => a)?.length || 0), 0);
 const visitedActs = trip.dailyItinerary.reduce((acc, day) => acc + (day.activities?.filter(a => a && a.isVisited)?.length || 0), 0);
 
 const progress = totalActs > 0 ? Math.round((visitedActs / totalActs) * 100) : 0;

 return (
 <div key={trip.id} onClick={() => setActiveTrip(trip.id)} className="relative group cursor-pointer bg-white border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden h-[360px] flex flex-col">
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
 )
 })}
 </div>
 {editingTrip && <EditTripModal trip={editingTrip} onClose={() => setEditingTrip(null)} />}
 {showNewTrip && <NewTripModal onClose={() => setShowNewTrip(false)} onConfirm={handleNewTripConfirm} />}
 </main>
 </div>
 );
}