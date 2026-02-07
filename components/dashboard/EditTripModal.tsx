"use client";
import { useState } from "react";
import { useTripStore } from "@/store/useTripStore";
import { X } from "lucide-react";

export default function EditTripModal({ trip, onClose }: any) {
  const { updateTripSettings } = useTripStore();
  const [title, setTitle] = useState(trip.title);
  const [startDate, setStartDate] = useState(trip.startDate);
  const [coverImage, setCoverImage] = useState(trip.coverImage);

  const handleSave = () => {
    updateTripSettings(trip.id, title, startDate, coverImage);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white p-8 w-full max-w-md shadow-2xl relative rounded-xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black"><X size={20}/></button>
        <h2 className="font-light text-xl mb-6 tracking-widest uppercase">編輯旅程</h2>
        <div className="space-y-4">
          <div><label className="text-xs text-gray-400 block mb-1">旅程名稱</label><input className="w-full border-b p-2" value={title} onChange={e=>setTitle(e.target.value)}/></div>
          <div><label className="text-xs text-gray-400 block mb-1">開始日期</label><input type="date" className="w-full border-b p-2" value={startDate} onChange={e=>setStartDate(e.target.value)}/></div>
          <div><label className="text-xs text-gray-400 block mb-1">封面圖片 URL</label><input className="w-full border-b p-2" value={coverImage} onChange={e=>setCoverImage(e.target.value)}/></div>
        </div>
        <div className="flex gap-4 mt-8">
           <button onClick={onClose} className="flex-1 border border-gray-200 py-3 text-xs tracking-widest uppercase">取消</button>
           <button onClick={handleSave} className="flex-1 bg-black text-white py-3 text-xs tracking-widest uppercase">儲存</button>
        </div>
      </div>
    </div>
  );
}