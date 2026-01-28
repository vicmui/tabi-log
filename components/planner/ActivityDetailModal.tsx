"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { X, CheckCircle, Star, Image as ImageIcon } from "lucide-react";
import { useTripStore } from "@/store/useTripStore";
import clsx from "clsx";

export default function ActivityDetailModal({ tripId, dayIndex, activityId, onClose }: any) {
  const { trips, updateActivity } = useTripStore();
  const trip = trips.find(t => t.id === tripId);
  const activity = trip?.dailyItinerary[dayIndex].activities.find(a => a.id === activityId);

  // 初始化狀態
  const [comment, setComment] = useState(activity?.comment || "");
  const [rating, setRating] = useState(activity?.rating || 0);

  if (!activity) return null;

  const handleSave = () => {
    updateActivity(tripId, dayIndex, activityId, { comment, rating });
    onClose();
  };

  const toggleVisited = () => {
    updateActivity(tripId, dayIndex, activityId, { isVisited: !activity.isVisited });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal 本體 */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="bg-white w-full max-w-lg relative z-10 shadow-2xl overflow-hidden"
      >
        {/* Header 圖片區 */}
        <div className="h-32 bg-gray-100 relative">
           {/* 這裡暫時用 Unsplash 圖，之後可以改成顯示活動照片 */}
           <img src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2000" className="w-full h-full object-cover opacity-80" />
           <div className="absolute top-4 right-4">
             <button onClick={onClose} className="bg-white/50 p-2 rounded-full hover:bg-white transition-colors">
               <X size={20}/>
             </button>
           </div>
        </div>
        
        <div className="p-8">
           {/* 標題與打卡按鈕 */}
           <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-serif font-bold text-jp-charcoal mb-1">{activity.location}</h2>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 uppercase tracking-wider">{activity.type}</span>
                  <span>{activity.time}</span>
                </div>
              </div>
              <button 
                onClick={toggleVisited} 
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 border transition-all text-xs font-bold tracking-wider uppercase", 
                  activity.isVisited ? "bg-black text-white border-black" : "border-gray-300 text-gray-400 hover:border-black hover:text-black"
                )}
              >
                <CheckCircle size={16} /> {activity.isVisited ? "已打卡" : "未去"}
              </button>
           </div>

           {/* 評分 Rating */}
           <div className="mb-6">
              <label className="text-[10px] font-bold text-gray-400 tracking-widest uppercase block mb-2">我的評分</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(star => (
                  <button key={star} onClick={() => setRating(star)} className={clsx("transition-colors", star <= rating ? "text-yellow-500" : "text-gray-200 hover:text-yellow-200")}>
                    <Star size={24} fill={star <= rating ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
           </div>

           {/* 感想 Comment */}
           <div className="mb-6">
              <label className="text-[10px] font-bold text-gray-400 tracking-widest uppercase block mb-2">旅後回憶 & 筆記</label>
              <textarea 
                value={comment} 
                onChange={e => setComment(e.target.value)}
                placeholder="寫下你的回憶..."
                className="w-full h-24 border border-gray-200 p-3 text-sm focus:outline-none focus:border-black resize-none bg-gray-50"
              />
           </div>

           {/* 上傳照片按鈕 (模擬) */}
           <div className="mb-8">
             <label className="text-[10px] font-bold text-gray-400 tracking-widest uppercase block mb-2">上傳照片</label>
             <div className="flex gap-2">
                <button className="w-16 h-16 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-black hover:text-black transition-colors">
                   <ImageIcon size={20}/>
                </button>
             </div>
           </div>

           <button onClick={handleSave} className="w-full bg-[#333333] text-white py-3 text-xs font-bold tracking-[0.2em] uppercase hover:bg-black transition-colors">
             儲存紀錄
           </button>
        </div>
      </motion.div>
    </div>
  );
}