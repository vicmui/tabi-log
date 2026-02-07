"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { X, CheckCircle, Star, Image as ImageIcon, Edit, Trash2, Camera } from "lucide-react";
import { useTripStore } from "@/store/useTripStore";
import clsx from "clsx";
import { supabase } from "@/lib/supabase"; // 引入 Supabase
import { v4 as uuidv4 } from 'uuid';

export default function ActivityDetailModal({ tripId, dayIndex, activityId, onClose }: any) {
  const { trips, updateActivity, deleteActivity } = useTripStore();
  const trip = trips.find(t => t.id === tripId);
  const activity = trip?.dailyItinerary[dayIndex].activities.find(a => a.id === activityId);

  // 狀態
  const [isEditing, setIsEditing] = useState(false);
  const [editLocation, setEditLocation] = useState(activity?.location || "");
  const [editTime, setEditTime] = useState(activity?.time || "");
  const [editNote, setEditNote] = useState(activity?.note || "");
  const [editCost, setEditCost] = useState(activity?.cost || 0);
  
  const [comment, setComment] = useState(activity?.comment || "");
  const [rating, setRating] = useState(activity?.rating || 0);
  const [photos, setPhotos] = useState(activity?.photos || []);

  if (!activity) return null;

  const handleSave = () => {
    if (isEditing) {
      updateActivity(tripId, dayIndex, activityId, { location: editLocation, time: editTime, note: editNote, cost: Number(editCost) });
      setIsEditing(false);
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
      const file = e.target.files?.;
      if (!file || !trip) return;

      const filePath = `public/${trip.id}/activities/${uuidv4()}-${file.name}`;
      const { data, error } = await supabase.storage.from('trip_files').upload(filePath, file);

      if (error) {
          alert("上傳失敗: " + error.message);
      } else {
          const { data: { publicUrl } } = supabase.storage.from('trip_files').getPublicUrl(filePath);
          const newPhotos = [...photos, publicUrl];
          setPhotos(newPhotos);
          updateActivity(tripId, dayIndex, activityId, { photos: newPhotos });
          alert("照片上傳成功！");
      }
  };

  return (
    <div className="fixed inset-0 z- flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-lg relative z-10 shadow-2xl overflow-hidden rounded-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="h-40 bg-gray-100 relative group shrink-0">
           {/* 優先顯示用戶上傳的第一張相，否則用預設 */}
           <img src={photos || "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?q=80&w=2000"} className="w-full h-full object-cover opacity-90" />
           <div className="absolute top-4 right-4 flex gap-2">
               <button onClick={() => setIsEditing(!isEditing)} className="bg-white/50 p-2 rounded-full hover:bg-white"><Edit size={16}/></button>
               <button onClick={onClose} className="bg-white/50 p-2 rounded-full hover:bg-white"><X size={20}/></button>
           </div>
        </div>
        
        {/* Main Content (Scrollable) */}
        <div className="p-8 overflow-y-auto">
           <div className="flex justify-between items-start mb-6">
              <div>
                {isEditing ? <input className="text-2xl font-serif font-bold text-jp-charcoal mb-1 border-b" value={editLocation} onChange={e=>setEditLocation(e.target.value)} /> : <h2 className="text-2xl font-serif font-bold text-jp-charcoal mb-1">{activity.location}</h2>}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 uppercase">{activity.type}</span>
                  {isEditing ? <input className="border-b w-20" value={editTime} onChange={e=>setEditTime(e.target.value)} /> : <span>{activity.time}</span>}
                </div>
              </div>
              <button onClick={toggleVisited} className={clsx("flex items-center gap-2 px-3 py-2 border text-xs font-bold tracking-wider uppercase rounded-lg", activity.isVisited ? "bg-black text-white" : "text-gray-400")}>
                <CheckCircle size={14} /> {activity.isVisited ? "已去" : "未去"}
              </button>
           </div>
           
           {isEditing ? (
               // 編輯模式
               <div className="space-y-4">
                  <div><label className="text-xs text-gray-400">備註</label><textarea value={editNote} onChange={e=>setEditNote(e.target.value)} className="w-full h-20 border border-gray-200 p-2 text-sm rounded-lg"/></div>
                  <div><label className="text-xs text-gray-400">費用 (¥)</label><input type="number" value={editCost} onChange={e=>setEditCost(Number(e.target.value))} className="w-full border p-2 text-sm rounded-lg"/></div>
               </div>
           ) : (
               // 檢視/評分模式
               <>
                 <div className="mb-6"><label className="text-xs text-gray-400 block mb-2">我的評分</label><div className="flex gap-2">{.map(star => (<button key={star} onClick={() => setRating(star)} className={clsx("transition-colors", star <= rating ? "text-yellow-500" : "text-gray-200")}><Star size={24} fill={star <= rating ? "currentColor" : "none"} /></button>))}</div></div>
                 <div className="mb-6"><label className="text-xs text-gray-400 block mb-2">旅後回憶</label><textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="寫低感受..." className="w-full h-24 border border-gray-200 p-3 text-sm rounded-lg"/></div>
                 <div className="mb-4">
                   <label className="text-xs text-gray-400 block mb-2">我的照片</label>
                   <div className="flex gap-2 flex-wrap">
                      {photos.map((url, i) => (
                         <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border"><img src={url} className="w-full h-full object-cover"/></div>
                      ))}
                      <label className="w-16 h-16 border border-dashed rounded-lg flex items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50"><Camera size={20}/><input type="file" className="hidden" onChange={handlePhotoUpload}/></label>
                   </div>
                 </div>
               </>
           )}
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex gap-2 shrink-0">
           <button onClick={handleDelete} className="text-red-500 p-3 rounded-lg hover:bg-red-50"><Trash2 size={16}/></button>
           <button onClick={handleSave} className="flex-1 bg-[#333333] text-white py-3 text-xs font-bold tracking-[0.2em] uppercase rounded-lg">
             {isEditing ? "儲存變更" : "儲存紀錄"}
           </button>
        </div>
      </motion.div>
    </div>
  );
}