"use client";
import { useState } from "react";
import { useTripStore } from "@/store/useTripStore";
import { X, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from 'uuid';

export default function EditTripModal({ trip, onClose }: any) {
  const { updateTripSettings } = useTripStore();
  const [title, setTitle] = useState(trip.title);
  const [startDate, setStartDate] = useState(trip.startDate);
  const [coverImage, setCoverImage] = useState(trip.coverImage);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const filePath = `public/${trip.id}/covers/${uuidv4()}-${file.name}`;
    const { error } = await supabase.storage.from('trip_files').upload(filePath, file);
    if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('trip_files').getPublicUrl(filePath);
        setCoverImage(publicUrl);
    } else {
        alert("上傳失敗");
    }
    setUploading(false);
  };

  const handleSave = () => {
    updateTripSettings(trip.id, title, startDate, coverImage);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white p-8 w-full max-w-md shadow-2xl relative rounded-xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black"><X size={20}/></button>
        <h2 className="font-light text-xl mb-6 tracking-widest uppercase">編輯旅程</h2>
        <div className="space-y-4">
          <div><label className="text-xs text-gray-400 block mb-1">旅程名稱</label><input className="w-full border-b p-2" value={title} onChange={e=>setTitle(e.target.value)}/></div>
          <div><label className="text-xs text-gray-400 block mb-1">開始日期</label><input type="date" className="w-full border-b p-2" value={startDate} onChange={e=>setStartDate(e.target.value)}/></div>
          
          <div>
              <label className="text-xs text-gray-400 block mb-2">封面圖片</label>
              <div className="h-32 w-full bg-gray-100 rounded-lg overflow-hidden relative group">
                  <img src={coverImage} className="w-full h-full object-cover" />
                  <label className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-white">
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      <div className="flex flex-col items-center"><Upload size={20}/><span className="text-xs mt-1">{uploading ? "上傳中..." : "更換封面"}</span></div>
                  </label>
              </div>
          </div>
        </div>
        <div className="flex gap-4 mt-8">
           <button onClick={onClose} className="flex-1 border border-gray-200 py-3 text-xs tracking-widest uppercase">取消</button>
           <button onClick={handleSave} className="flex-1 bg-black text-white py-3 text-xs tracking-widest uppercase">儲存</button>
        </div>
      </div>
    </div>
  );
}