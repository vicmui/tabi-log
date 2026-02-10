"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [editCost, setEditCost] = useState(activity?.cost ? activity.cost.toString() : "");
  const [currency, setCurrency] = useState("JPY"); 
  const [editAddress, setEditAddress] = useState(activity?.address || "");
  const [editLat, setEditLat] = useState(activity?.lat);
  const [editLng, setEditLng] = useState(activity?.lng);
  
  const [comment, setComment] = useState(activity?.comment || "");
  const [rating, setRating] = useState(activity?.rating || 0);
  const [photos, setPhotos] = useState<string[]>(activity?.photos || []);
  
  // 🔥 Lightbox 狀態
  const [expandedImg, setExpandedImg] = useState<string | null>(null);

  const rate = 0.052; 
  if (!activity) return null;

  const handleSave = () => {
    if (isEditing) {
      let finalCost = Number(editCost);
      if (currency === "HKD") finalCost = Math.round(Number(editCost) / rate);
      updateActivity(tripId, dayIndex, activityId, { location: editLocation, type: editType, time: editTime, note: editNote, cost: finalCost, address: editAddress, lat: editLat, lng: editLng });
      setIsEditing(false); setEditCost(finalCost.toString()); setCurrency("JPY");
    } else {
      updateActivity(tripId, dayIndex, activityId, { comment, rating, photos });
      onClose(); // 儲存後關閉
    }
  };

  const toggleVisited = () => { updateActivity(tripId, dayIndex, activityId, { isVisited: !activity.isVisited }); };
  const handleDelete = () => { if(confirm(`確定刪除「${activity.location}」嗎？`)) { deleteActivity(tripId, dayIndex, activity.id); onClose(); } };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      // 🔥 限制 3 張
      if (photos.length >= 3) { alert("最多只能上傳 3 張照片！"); return; }

      const file = e.target.files?.[0];
      if (!file || !trip) return;
      const filePath = `public/${trip.id}/activities/${uuidv4()}-${file.name}`;
      const { data, error } = await supabase.storage.from('trip_files').upload(filePath, file);
      if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('trip_files').getPublicUrl(filePath);
          const newPhotos = [...photos, publicUrl];
          setPhotos(newPhotos);
          updateActivity(tripId, dayIndex, activityId, { photos: newPhotos });
      } else { alert("上傳失敗"); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-lg relative z-10 shadow-2xl overflow-hidden rounded-xl max-h-[90vh] flex flex-col">
        {/* Header 封面 (取第一張圖) */}
        <div className="h-40 bg-gray-100 relative group shrink-0">
           <img src={photos.length > 0 ? photos[0] : "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?q=80&w=2000"} className="w-full h-full object-cover opacity-90" />
           <div className="absolute top-4 right-4 flex gap-2">
               <button onClick={() => setIsEditing(!isEditing)} className="bg-white/80 p-2 rounded-full hover:bg-white text-black"><Edit size={16}/></button>
               <button onClick={onClose} className="bg-white/80 p-2 rounded-full hover:bg-white text-black"><X size={20}/></button>
           </div>
        </div>
        
        <div className="p-8 overflow-y-auto">
           {/* ... 編輯與檢視代碼 (保持不變) ... */}
           {/* 為了節省空間，這裡省略重複的編輯 UI，請確保保留之前的 UI code */}
           {/* ... 這裡只展示相簿部分的更新 ... */}
           {!isEditing && (
             <>
                <div className="flex justify-between items-start mb-6"><div><h2 className="text-2xl font-serif font-bold text-jp-charcoal mb-1">{activity.location}</h2><div className="flex items-center gap-2 text-xs text-gray-500"><span className="bg-gray-100 px-2 py-1 uppercase">{activity.type}</span><span>{activity.time}</span></div></div><button onClick={toggleVisited} className={clsx("flex-shrink-0 flex items-center gap-2 px-3 py-2 border text-xs font-bold tracking-wider uppercase rounded-lg transition-colors", activity.isVisited ? "bg-black text-white" : "text-gray-400")}><CheckCircle size={14} /> {activity.isVisited ? "已去" : "未去"}</button></div>
                {activity.cost > 0 && <div className="mb-6"><span className="text-xl font-bold font-mono">¥{activity.cost.toLocaleString()}</span></div>}
                {activity.note && <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100"><p className="text-sm text-gray-600 leading-relaxed">{activity.note}</p></div>}
                
                <div className="mb-6"><label className="text-[10px] text-gray-400 block mb-2 uppercase tracking-widest">我的評分</label><div className="flex gap-2">{[1,2,3,4,5].map(star => (<button key={star} onClick={() => setRating(star)} className={clsx("transition-colors", star <= rating ? "text-yellow-500" : "text-gray-200")}><Star size={24} fill={star <= rating ? "currentColor" : "none"} /></button>))}</div></div>
                <div className="mb-6"><label className="text-[10px] text-gray-400 block mb-2 uppercase tracking-widest">旅後回憶</label><textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="寫低感受..." className="w-full h-24 border border-gray-200 p-3 text-sm rounded-lg focus:outline-none focus:border-black resize-none"/></div>
                
                {/* 🔥 相簿區 (Max 3) */}
                <div className="mb-4">
                   <div className="flex justify-between items-center mb-2">
                       <label className="text-[10px] text-gray-400 uppercase tracking-widest">相簿 Gallery ({photos.length}/3)</label>
                   </div>
                   <div className="flex gap-2">
                      {photos.map((url, i) => (
                         <div key={i} className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:opacity-80" onClick={() => setExpandedImg(url)}>
                            <img src={url} className="w-full h-full object-cover"/>
                         </div>
                      ))}
                      {photos.length < 3 && (
                          <label className="w-20 h-20 border border-dashed rounded-lg flex items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 hover:border-black hover:text-black transition-colors">
                              <Camera size={20}/><input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload}/>
                          </label>
                      )}
                   </div>
                </div>
             </>
           )}
        </div>
        
        <div className="p-6 border-t border-gray-100 flex gap-2 shrink-0 bg-white">
           <button onClick={handleDelete} className="text-gray-400 p-3 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
           <button onClick={handleSave} className="flex-1 bg-[#333333] text-white py-3 text-xs font-bold tracking-[0.2em] uppercase rounded-lg hover:bg-black transition-colors shadow-lg">{isEditing ? "儲存變更" : "儲存紀錄"}</button>
        </div>
      </motion.div>

      {/* 🔥 Lightbox (放大圖) */}
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