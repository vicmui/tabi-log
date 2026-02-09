"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { X, CheckCircle, Star, Image as ImageIcon, Edit, Trash2, Camera, ArrowRightLeft } from "lucide-react";
import { useTripStore } from "@/store/useTripStore";
import clsx from "clsx";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from 'uuid';

export default function ActivityDetailModal({ tripId, dayIndex, activityId, onClose }: any) {
  const { trips, updateActivity, deleteActivity } = useTripStore();
  const trip = trips.find(t => t.id === tripId);
  const activity = trip?.dailyItinerary[dayIndex].activities.find(a => a.id === activityId);

  // 狀態管理
  const [isEditing, setIsEditing] = useState(false);
  
  // 編輯欄位
  const [editLocation, setEditLocation] = useState(activity?.location || "");
  const [editTime, setEditTime] = useState(activity?.time || "");
  const [editNote, setEditNote] = useState(activity?.note || "");
  
  // 🔥 費用與幣值狀態
  const [editCost, setEditCost] = useState(activity?.cost ? activity.cost.toString() : "");
  const [currency, setCurrency] = useState("JPY"); 

  // 評分與感想
  const [comment, setComment] = useState(activity?.comment || "");
  const [rating, setRating] = useState(activity?.rating || 0);
  const [photos, setPhotos] = useState(activity?.photos || []);

  const rate = 0.052; // 匯率設定 (可從 trip.exchangeRate 讀取)

  if (!activity) return null;

  const handleSave = () => {
    if (isEditing) {
      // 🔥 儲存時處理匯率
      let finalCost = Number(editCost);
      if (currency === "HKD") {
          finalCost = Math.round(Number(editCost) / rate);
      }

      updateActivity(tripId, dayIndex, activityId, { 
          location: editLocation, 
          time: editTime, 
          note: editNote, 
          cost: finalCost 
      });
      setIsEditing(false);
      // Reset currency display back to JPY (store uses JPY)
      setEditCost(finalCost.toString());
      setCurrency("JPY");
    } else {
      updateActivity(tripId, dayIndex, activityId, { comment, rating, photos });
    }
  };

  const toggleVisited = () => {
    updateActivity(tripId, dayIndex, activityId, { isVisited: !activity.isVisited });
  };
  
  const handleDelete = () => {
      if(confirm(`確定刪除「${activity.location}」嗎？`)) {
          deleteActivity(tripId, dayIndex, activity.id);
          onClose();
      }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files && e.target.files[0];
      if (!file || !trip) return;

      const filePath = `public/${trip.id}/activities/${uuidv4()}-${file.name}`;
      const { error } = await supabase.storage.from('trip_files').upload(filePath, file);

      if (error) {
          alert("上傳失敗: " + error.message);
      } else {
          const { data: { publicUrl } } = supabase.storage.from('trip_files').getPublicUrl(filePath);
          const newPhotos = [publicUrl, ...photos];
          setPhotos(newPhotos);
          updateActivity(tripId, dayIndex, activityId, { photos: newPhotos });
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-lg relative z-10 shadow-2xl overflow-hidden rounded-xl max-h-[90vh] flex flex-col">
        {/* Header Photo */}
        <div className="h-40 bg-gray-100 relative group shrink-0">
           <img src={photos.length > 0 ? photos[0] : "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?q=80&w=2000"} className="w-full h-full object-cover opacity-90" />
           <div className="absolute top-4 right-4 flex gap-2">
               {/* 上傳照片按鈕 (僅在檢視模式顯示，或隨時顯示皆可，這裡設為隨時) */}
               <label className="bg-white/50 p-2 rounded-full hover:bg-white cursor-pointer"><Camera size={16}/><input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload}/></label>
               
               <button onClick={() => setIsEditing(!isEditing)} className="bg-white/50 p-2 rounded-full hover:bg-white"><Edit size={16}/></button>
               <button onClick={onClose} className="bg-white/50 p-2 rounded-full hover:bg-white"><X size={20}/></button>
           </div>
        </div>
        
        {/* Main Content */}
        <div className="p-8 overflow-y-auto">
           <div className="flex justify-between items-start mb-6">
              <div className="flex-1 mr-4">
                {isEditing ? (
                    <input className="text-2xl font-serif font-bold text-jp-charcoal mb-1 border-b w-full focus:outline-none focus:border-black" value={editLocation} onChange={e=>setEditLocation(e.target.value)} />
                ) : (
                    <h2 className="text-2xl font-serif font-bold text-jp-charcoal mb-1">{activity.location}</h2>
                )}
                
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                  <span className="bg-gray-100 px-2 py-1 uppercase tracking-wider rounded-sm">{activity.type}</span>
                  {isEditing ? <input className="border-b w-20 focus:outline-none focus:border-black" value={editTime} onChange={e=>setEditTime(e.target.value)} /> : <span>{activity.time}</span>}
                </div>
              </div>

              <button onClick={toggleVisited} className={clsx("flex-shrink-0 flex items-center gap-2 px-3 py-2 border text-xs font-bold tracking-wider uppercase rounded-lg transition-colors", activity.isVisited ? "bg-black text-white" : "text-gray-400 hover:border-black hover:text-black")}>
                <CheckCircle size={14} /> {activity.isVisited ? "已去" : "未去"}
              </button>
           </div>
           
           {isEditing ? (
               // === 編輯模式 ===
               <div className="space-y-5">
                  {/* 費用編輯 (含匯率切換) */}
                  <div>
                     <label className="text-[10px] text-gray-400 block mb-1 uppercase tracking-widest">費用 Cost</label>
                     <div className="flex items-center border-b border-gray-200 pb-1">
                        <input type="number" value={editCost} onChange={e=>setEditCost(e.target.value)} className="w-full text-sm focus:outline-none" placeholder="0"/>
                        <button type="button" onClick={()=>setCurrency(currency==="JPY"?"HKD":"JPY")} className="text-[10px] font-bold px-2 py-1 bg-gray-100 rounded flex items-center gap-1 hover:bg-gray-200">
                            {currency} <ArrowRightLeft size={10}/>
                        </button>
                     </div>
                     {currency === "HKD" && editCost && <p className="text-[9px] text-gray-400 text-right mt-1">≈ ¥{Math.round(Number(editCost)/rate).toLocaleString()}</p>}
                  </div>

                  <div>
                      <label className="text-[10px] text-gray-400 block mb-1 uppercase tracking-widest">備註 Note</label>
                      <textarea value={editNote} onChange={e=>setEditNote(e.target.value)} className="w-full h-24 border border-gray-200 p-3 text-sm rounded-lg focus:outline-none focus:border-black resize-none"/>
                  </div>
               </div>
           ) : (
               // === 檢視模式 ===
               <>
                 {/* 顯示費用 */}
                 {activity.cost > 0 && (
                     <div className="mb-6">
                         <span className="text-xl font-bold font-mono">¥{activity.cost.toLocaleString()}</span>
                     </div>
                 )}

                 {/* 備註顯示 */}
                 {activity.note && (
                     <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                         <p className="text-sm text-gray-600 leading-relaxed">{activity.note}</p>
                     </div>
                 )}

                 {/* 評分 */}
                 <div className="mb-6">
                    <label className="text-[10px] text-gray-400 block mb-2 uppercase tracking-widest">我的評分</label>
                    <div className="flex gap-2">
                        {[1,2,3,4,5].map(star => (
                            <button key={star} onClick={() => setRating(star)} className={clsx("transition-colors", star <= rating ? "text-yellow-500" : "text-gray-200")}>
                                <Star size={24} fill={star <= rating ? "currentColor" : "none"} />
                            </button>
                        ))}
                    </div>
                 </div>

                 {/* 旅後回憶 */}
                 <div className="mb-6">
                    <label className="text-[10px] text-gray-400 block mb-2 uppercase tracking-widest">旅後回憶</label>
                    <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="寫低感受..." className="w-full h-24 border border-gray-200 p-3 text-sm rounded-lg focus:outline-none focus:border-black resize-none"/>
                 </div>

                 {/* 照片牆 */}
                 <div className="mb-4">
                   <label className="text-[10px] text-gray-400 block mb-2 uppercase tracking-widest">相簿 Gallery</label>
                   <div className="flex gap-2 flex-wrap">
                      {photos.map((url: string, i: number) => (
                         <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200"><img src={url} className="w-full h-full object-cover"/></div>
                      ))}
                      {/* 如果沒有照片，顯示提示 */}
                      {photos.length === 0 && <span className="text-xs text-gray-300">暫無照片，點擊右上角相機上傳</span>}
                   </div>
                 </div>
               </>
           )}
        </div>
        
        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 flex gap-2 shrink-0 bg-white">
           <button onClick={handleDelete} className="text-gray-400 p-3 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
           <button onClick={handleSave} className="flex-1 bg-[#333333] text-white py-3 text-xs font-bold tracking-[0.2em] uppercase rounded-lg hover:bg-black transition-colors shadow-lg">
             {isEditing ? "儲存變更" : "儲存紀錄"}
           </button>
        </div>
      </motion.div>
    </div>
  );
}