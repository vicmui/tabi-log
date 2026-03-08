"use client";
import { useState } from "react";
import { useTripStore } from "@/store/useTripStore";
import { X, Upload, ImagePlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from 'uuid';
import { AlertDialog } from "@/components/ui/Dialog";
import { RepositionPanel } from "@/components/ui/RepositionPanel";

export default function EditTripModal({ trip, onClose }: any) {
  const { updateTripSettings } = useTripStore();
  const [title, setTitle]           = useState(trip.title);
  const [startDate, setStartDate]   = useState(trip.startDate);
  const [coverImage, setCoverImage] = useState(trip.coverImage || '');
  // Load saved position from localStorage if exists
  const savedPos = (() => { try { const m = localStorage.getItem(`coverPos-trip-${trip.id}`); return m ? Number(m) : 50; } catch { return 50; } })();
  const [coverPosY, setCoverPosY]   = useState<number>(savedPos);
  const [uploading, setUploading]   = useState(false);
  const [repositioning, setRepositioning] = useState(false);
  const [alertMsg, setAlertMsg]     = useState<string | null>(null);

  const savePosY = (y: number) => {
    setCoverPosY(y);
    try { localStorage.setItem(`coverPos-trip-${trip.id}`, String(y)); } catch (_) {}
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const filePath = `public/${trip.id}/covers/${uuidv4()}-${file.name}`;
    const { error } = await supabase.storage.from('trip_files').upload(filePath, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('trip_files').getPublicUrl(filePath);
      setCoverImage(publicUrl);
      setCoverPosY(50);
      setRepositioning(true);   // auto-open reposition after upload
    } else {
      setAlertMsg("封面上傳失敗，請重試。");
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleSave = () => {
    updateTripSettings(trip.id, title, startDate, coverImage);
    // coverPosY is already saved to localStorage in savePosY()
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white p-8 w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black"><X size={20} /></button>
        <h2 className="font-light text-xl mb-6 tracking-widest uppercase">編輯旅程</h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">旅程名稱</label>
            <input className="w-full border-b p-2 focus:outline-none focus:border-black" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          {/* Start date */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">開始日期</label>
            <input type="date" className="w-full border-b p-2 focus:outline-none focus:border-black" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>

          {/* Cover image */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="text-xs text-gray-400">封面圖片</label>
              {/* ✅ Size reminder */}
              <span className="text-[9px] text-gray-400">建議 <span className="font-bold text-gray-500">2400×800px</span> · 橫向</span>
            </div>

            {/* ✅ Reposition slider (inline, compact) */}
            {repositioning && coverImage ? (
              <RepositionPanel
                compact
                src={coverImage}
                initialY={coverPosY}
                onConfirm={y => { savePosY(y); setRepositioning(false); }}
                onCancel={() => setRepositioning(false)}
              />
            ) : (
              <div className="h-32 w-full bg-gray-100 overflow-hidden relative group">
                {coverImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverImage} alt="cover"
                      className="w-full h-full object-cover"
                      style={{ objectPosition: `center ${coverPosY}%` }}
                    />
                    {/* Controls — always visible on mobile, hover on desktop */}
                    <div className="absolute inset-0 bg-black/30 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        onClick={() => setRepositioning(true)}
                        className="flex items-center gap-1.5 bg-white text-black text-[10px] font-bold uppercase tracking-widest px-3 py-1.5"
                      >
                        調整位置
                      </button>
                      <label className="flex items-center gap-1.5 bg-white text-black text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 cursor-pointer">
                        <Upload size={11} /> 更換
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                      </label>
                    </div>
                  </>
                ) : (
                  /* Empty state with prominent reminder */
                  <label className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-50 to-gray-100 cursor-pointer hover:from-gray-100 hover:to-gray-200 transition-colors border border-dashed border-gray-200">
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                    {uploading ? (
                      <span className="text-xs text-gray-400 animate-pulse">上傳中...</span>
                    ) : (
                      <>
                        <div className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center shadow-sm">
                          <ImagePlus size={18} className="text-gray-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-[11px] font-bold text-gray-500 tracking-widest uppercase">上傳封面</p>
                          <p className="text-[10px] text-gray-400 mt-0.5"><span className="font-bold text-gray-500">2400 × 800px</span> · JPG / PNG</p>
                          <p className="text-[9px] text-gray-300 mt-0.5">上傳後可調整焦點位置</p>
                        </div>
                      </>
                    )}
                  </label>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons — hidden during repositioning so layout stays clean */}
        {!repositioning && (
          <div className="flex gap-4 mt-8">
            <button onClick={onClose} className="flex-1 border border-gray-200 py-3 text-xs tracking-widest uppercase hover:bg-gray-50 transition-colors">取消</button>
            <button onClick={handleSave} className="flex-1 bg-black text-white py-3 text-xs tracking-widest uppercase hover:bg-gray-800 transition-colors">儲存</button>
          </div>
        )}
      </div>
      <AlertDialog isOpen={!!alertMsg} message={alertMsg || ""} onClose={() => setAlertMsg(null)} />
    </div>
  );
}
