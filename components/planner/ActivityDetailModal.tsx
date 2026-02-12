"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, CheckCircle, Star, Image as ImageIcon, Edit, Trash2, Camera, ArrowRightLeft, MapPin } from "lucide-react";
import { useTripStore } from "@/store/useTripStore";
import clsx from "clsx";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from 'uuid';
import GooglePlacesAutocomplete, { geocodeByPlaceId, getLatLng } from 'react-google-places-autocomplete';

const TYPES = [{ type: "Food", label: "美食" }, { type: "Sightseeing", label: "景點" }, { type: "Shopping", label: "購物" }, { type: "Transport", label: "交通" }, { type: "Hotel", label: "住宿" }, { type: "Other", label: "其他" }];

export default function ActivityDetailModal({ tripId, dayIndex, activityId, onClose }: any) {
  const { trips, updateActivity, deleteActivity } = useTripStore();
  const trip = trips.find(t => t.id === tripId);
  const activity = trip?.dailyItinerary[dayIndex].activities.find(a => a.id === activityId);

  const [isEditing, setIsEditing] = useState(false);
  const [editLocation, setEditLocation] = useState(activity?.location || "");
  const [editType, setEditType] = useState(activity?.type || "Food");
  const [editTime, setEditTime] = useState(activity?.time || "");
  const [editNote, setEditNote] = useState(activity?.note || "");
  const [editAddress, setEditAddress] = useState(activity?.address || "");
  const [editLat, setEditLat] = useState(activity?.lat);
  const [editLng, setEditLng] = useState(activity?.lng);
  
  const [apiKey, setApiKey] = useState("");
  const [comment, setComment] = useState(activity?.comment || "");
  const [rating, setRating] = useState(activity?.rating || 0);
  const [photos, setPhotos] = useState<string[]>(activity?.photos || []);
  const [expandedImg, setExpandedImg] = useState<string | null>(null);

  useEffect(() => { const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY; if (key) setApiKey(key); }, []);

  if (!activity) return null;

  const handleSave = () => {
    if (isEditing) {
      // 🔥 這裡不再更新 cost，保持為 0 (或原本數值)
      updateActivity(tripId, dayIndex, activityId, { 
          location: editLocation, type: editType, time: editTime, 
          note: editNote, address: editAddress, 
          lat: editLat, lng: editLng
      });
      setIsEditing(false);
    } else {
      updateActivity(tripId, dayIndex, activityId, { comment, rating, photos });
      onClose();
    }
  };

  const toggleVisited = () => { updateActivity(tripId, dayIndex, activityId, { isVisited: !activity.isVisited }); };
  const handleDelete = () => { if(confirm(`確定刪除「${activity.location}」嗎？`)) { deleteActivity(tripId, dayIndex, activity.id); onClose(); } };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (photos.length >= 3) { alert("最多 3 張！"); return; }
      const file = e.target.files && e.target.files[0];
      if (!file || !trip) return;
      
      try {
          const filePath = `public/${trip.id}/activities/${uuidv4()}-${file.name}`;
          const { error } = await supabase.storage.from('trip_files').upload(filePath, file);
          if (error) throw error;
          const { data: { publicUrl } } = supabase.storage.from('trip_files').getPublicUrl(filePath);
          const newPhotos = [publicUrl, ...photos];
          setPhotos(newPhotos);
          updateActivity(tripId, dayIndex, activityId, { photos: newPhotos });
      } catch(e: any) { alert("上傳失敗: " + e.message); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-lg relative z-10 shadow-2xl overflow-hidden rounded-xl max-h-[90vh] flex flex-col">
        <div className="h-40 bg-gray-100 relative group shrink-0">
           <img src={photos.length > 0 ? photos[0] : "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?q=80&w=2000"} className="w-full h-full object-cover opacity-90" />
           <div className="absolute top-4 right-4 flex gap-2">
               {!isEditing && <label className="bg-white/50 p-2 rounded-full hover:bg-white cursor-pointer"><Camera size={16}/><input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload}/></label>}
               <button onClick={() => setIsEditing(!isEditing)} className="bg-white/50 p-2 rounded-full hover:bg-white"><Edit size={16}/></button>
               <button onClick={onClose} className="bg-white/50 p-2 rounded-full hover:bg-white"><X size={20}/></button>
           </div>
        </div>
        
        <div className="p-8 overflow-y-auto">
           {isEditing ? (
               <div className="space-y-5">
                  <div><label className="text-xs text-gray-400 font-bold mb-1 block uppercase tracking-widest">地點名稱</label><input className="text-lg font-bold w-full border-b p-1 focus:border-black outline-none" value={editLocation} onChange={e=>setEditLocation(e.target.value)} /></div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <label className="text-[10px] text-blue-500 font-bold mb-1 block uppercase tracking-widest">連結 Google Map</label>
                      {apiKey ? (
                        <div className="bg-white border p-1 rounded">
                           <GooglePlacesAutocomplete apiKey={apiKey} selectProps={{ 
                               placeholder: "輸入地點獲取座標...",
                               onChange: async (val: any) => { 
                                   if (!val) return; 
                                   setEditAddress(val.label); 
                                   try {
                                       const results = await geocodeByPlaceId(val.value.place_id); 
                                       const { lat, lng } = await getLatLng(results[0]); 
                                       setEditLat(lat); setEditLng(lng); 
                                       if(!editLocation) setEditLocation(val.label.split(',')[0]);
                                   } catch(e) { alert("無法獲取座標"); }
                               }, 
                               styles: { control: (p) => ({ ...p, border: 'none', boxShadow: 'none', minHeight: '30px', fontSize: '13px' }) } 
                           }} />
                        </div>
                      ) : <p className="text-xs text-red-500">API Key Missing</p>}
                      <div className="flex items-center gap-2 mt-2"><span className={clsx("w-2 h-2 rounded-full", editLat && editLng ? "bg-green-500" : "bg-red-500")}/> <span className="text-[10px] text-gray-500">{editLat && editLng ? `座標鎖定` : "未有座標"}</span></div>
                  </div>
                  <div className="flex gap-4"><div className="flex-1"><label className="text-xs text-gray-400 uppercase tracking-widest">時間</label><input className="w-full border-b p-1" value={editTime} onChange={e=>setEditTime(e.target.value)} /></div><div className="flex-1"><label className="text-xs text-gray-400 uppercase tracking-widest">類別</label><select className="w-full border-b p-1 bg-white" value={editType} onChange={e=>setEditType(e.target.value)}>{TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}</select></div></div>
                  {/* 🔥 已移除費用編輯欄位 */}
                  <div><label className="text-xs text-gray-400 uppercase tracking-widest">備註</label><textarea value={editNote} onChange={e=>setEditNote(e.target.value)} className="w-full h-20 border border-gray-200 p-2 text-sm rounded-lg"/></div>
               </div>
           ) : (
               <>
                 <div className="flex justify-between items-start mb-6"><div><h2 className="text-2xl font-serif font-bold text-jp-charcoal mb-1">{activity.location}</h2><div className="flex items-center gap-2 text-xs text-gray-500"><span className="bg-gray-100 px-2 py-1 uppercase">{activity.type}</span><span>{activity.time}</span></div>{activity.address && <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1"><MapPin size={10}/> {activity.address}</p>}</div><button onClick={toggleVisited} className={clsx("flex-shrink-0 flex items-center gap-2 px-3 py-2 border text-xs font-bold tracking-wider uppercase rounded-lg transition-colors", activity.isVisited ? "bg-black text-white" : "text-gray-400")}><CheckCircle size={14} /> {activity.isVisited ? "已去" : "未去"}</button></div>
                 {/* 🔥 已移除費用顯示 */}
                 {activity.note && <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100"><p className="text-sm text-gray-600 leading-relaxed">{activity.note}</p></div>}
                 <div className="mb-6"><label className="text-[10px] text-gray-400 block mb-2 uppercase tracking-widest">我的評分</label><div className="flex gap-2">{[1,2,3,4,5].map(star => (<button key={star} onClick={() => setRating(star)} className={clsx("transition-colors", star <= rating ? "text-yellow-500" : "text-gray-200")}><Star size={24} fill={star <= rating ? "currentColor" : "none"} /></button>))}</div></div>
                 <div className="mb-6"><label className="text-[10px] text-gray-400 block mb-2 uppercase tracking-widest">旅後回憶</label><textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="寫低感受..." className="w-full h-24 border border-gray-200 p-3 text-sm rounded-lg focus:outline-none focus:border-black resize-none"/></div>
                 <div className="mb-4"><label className="text-[10px] text-gray-400 block mb-2 uppercase tracking-widest">相簿 Gallery</label><div className="flex gap-2 flex-wrap">{photos.map((url: string, i: number) => (<div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:opacity-80" onClick={() => setExpandedImg(url)}><img src={url} className="w-full h-full object-cover"/></div>))}{photos.length === 0 && <span className="text-xs text-gray-300">暫無照片，點擊右上角相機上傳</span>}</div></div>
               </>
           )}
        </div>
        
        <div className="p-6 border-t border-gray-100 flex gap-2 shrink-0 bg-white">
           <button onClick={handleDelete} className="text-gray-400 p-3 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
           <button onClick={handleSave} className="flex-1 bg-[#333333] text-white py-3 text-xs font-bold tracking-[0.2em] uppercase rounded-lg hover:bg-black transition-colors shadow-lg">{isEditing ? "儲存變更" : "儲存紀錄"}</button>
        </div>
      </motion.div>

      <AnimatePresence>
        {expandedImg && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExpandedImg(null)} className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4">
                <img src={expandedImg} className="max-w-full max-h-full rounded-lg shadow-2xl" />
                <button className="absolute top-4 right-4 text-white/80 hover:text-white"><X size={32}/></button>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}