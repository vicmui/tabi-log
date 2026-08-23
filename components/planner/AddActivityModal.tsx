"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Utensils, Camera, Train, Bed, ShoppingBag, MapPin, Upload, Loader2 } from "lucide-react";
import PlacesSearch from "@/components/ui/PlacesSearch";
import clsx from "clsx";
import { supabase } from "@/lib/supabase";

interface Props {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  tripId?: string
  destLat?: number
  destLng?: number
}

const TYPES = [
  { type: "Food",        icon: Utensils,    label: "美食" },
  { type: "Sightseeing", icon: Camera,      label: "景點" },
  { type: "Shopping",    icon: ShoppingBag, label: "購物" },
  { type: "Transport",   icon: Train,       label: "交通" },
  { type: "Hotel",       icon: Bed,         label: "住宿" },
  { type: "Other",       icon: MapPin,      label: "其他" },
];

export default function AddActivityModal({ isOpen, onClose, onSubmit, tripId, destLat, destLng }: Props) {
  const [type, setType]             = useState("Food");
  const [time, setTime]             = useState("");
  const [customName, setCustomName] = useState("");
  const [address, setAddress]       = useState("");
  const [note, setNote]             = useState("");
  const [lat, setLat]               = useState<number | null>(null);
  const [lng, setLng]               = useState<number | null>(null);
  const [placeId, setPlaceId]       = useState<string | null>(null);
  const [googleMapsUri, setGoogleMapsUri] = useState<string | null>(null);
  const [refPhoto, setRefPhoto]     = useState<string | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const ext  = file.name.split('.').pop();
      const path = `public/${tripId || 'tmp'}/ref-photos/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('trip_files').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('trip_files').getPublicUrl(path);
      setRefPhoto(data.publicUrl);
    } catch (err: any) {
      setUploadError('上傳失敗：' + (err?.message || '未知錯誤'));
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setCustomName(''); setAddress(''); setNote('');
    setLat(null); setLng(null); setTime(''); setRefPhoto(null);
    setPlaceId(null); setGoogleMapsUri(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = customName || address;
    if (!finalTitle) return;
    onSubmit({ type, time: time || null, location: finalTitle, address, note, lat, lng, refPhoto, placeId: placeId ?? undefined, googleMapsUri: googleMapsUri ?? undefined });
    reset();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 m-auto w-full max-w-md h-fit bg-white border border-neutral-200 z-[101] p-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-serif font-bold tracking-widest text-[#333333]">新增活動</h2>
              <button onClick={onClose}><X size={20} className="text-gray-500 hover:text-black" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Type */}
              <div>
                <label className="block text-xs text-gray-500 mb-2">類別</label>
                <div className="grid grid-cols-6 gap-2">
                  {TYPES.map(t => (
                    <button key={t.type} type="button" onClick={() => setType(t.type)}
                      className={clsx("flex flex-col items-center justify-center py-2 gap-1 border",
                        type === t.type ? "bg-black text-white" : "bg-white text-gray-500 border-gray-100"
                      )}>
                      <t.icon size={14} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">活動名稱</label>
                <input type="text" placeholder="例: Harbs 午餐" value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full border-b py-2 text-sm focus:outline-none focus:border-black" />
              </div>

              {/* ✅ New Places Search using AutocompleteSuggestion API */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">地點搜尋</label>
                <PlacesSearch
                  placeholder="搜尋地點獲取座標..."
                  locationBias={destLat && destLng ? { lat: destLat, lng: destLng } : undefined}
                  onSelect={result => {
                    if (!customName) setCustomName(result.name);
                    setAddress(result.label);
                    if (result.lat && result.lng) { setLat(result.lat); setLng(result.lng); }
                    setPlaceId(result.placeId ?? null);
                    setGoogleMapsUri(result.googleMapsUri ?? null);
                  }}
                />
                <div className="flex items-center gap-2 mt-2">
                  <span className={clsx("w-2 h-2 rounded-full", placeId ? "bg-green-500" : lat && lng ? "bg-amber-400" : "bg-red-400")} />
                  <span className="text-xs text-gray-500">
                    {placeId ? "已連結 Google 地點" : lat && lng ? "只有座標，未連結 Google" : "尚未取得座標"}
                  </span>
                </div>
              </div>

              {/* Time + Note */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">時間 <span className="text-gray-400">(選填)</span></label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)}
                    className="w-full border-b py-2 text-sm focus:outline-none focus:border-black" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">備註</label>
                  <input type="text" value={note} onChange={e => setNote(e.target.value)}
                    className="w-full border-b py-2 text-sm focus:outline-none focus:border-black" placeholder="選填..." />
                </div>
              </div>

              {/* Reference photo */}
              <div>
                <label className="block text-xs text-gray-500 mb-2">
                  參考圖片 <span className="text-gray-400">(選填)</span>
                </label>
                {refPhoto ? (
                  <div className="relative w-full h-32 overflow-hidden border border-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={refPhoto} className="w-full h-full object-cover" alt="ref" />
                    <button type="button" onClick={() => setRefPhoto(null)}
                      className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 w-full border border-dashed border-gray-200 py-3 px-4 text-xs text-gray-500 cursor-pointer hover:border-black hover:text-black transition-colors">
                    {uploading
                      ? <><Loader2 size={14} className="animate-spin" /> 上傳中...</>
                      : <><Upload size={14} /> 上傳圖片 (JPG/PNG，最大 5MB)</>
                    }
                    <input ref={fileRef} type="file" accept="image/*" className="hidden"
                      onChange={handlePhotoUpload} disabled={uploading} />
                  </label>
                )}
                {uploadError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 mt-2">
                    {uploadError}
                  </p>
                )}
              </div>

              <button type="submit" disabled={!customName && !address}
                className={clsx("w-full py-3 text-xs font-bold uppercase mt-2",
                  (!customName && !address) ? "bg-gray-300 cursor-not-allowed" : "bg-black text-white"
                )}>
                確認新增
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
