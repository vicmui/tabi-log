"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Utensils, Camera, Train, Bed, ShoppingBag, MapPin, Upload, Loader2, ImageIcon } from "lucide-react";
import GooglePlacesAutocomplete, { geocodeByPlaceId, getLatLng } from 'react-google-places-autocomplete';
import clsx from "clsx";
import { createClient } from '@supabase/supabase-js';

interface Props { isOpen: boolean; onClose: () => void; onSubmit: (data: any) => void; tripId?: string; destLat?: number; destLng?: number; }
const TYPES = [{ type: "Food", icon: Utensils, label: "美食" }, { type: "Sightseeing", icon: Camera, label: "景點" }, { type: "Shopping", icon: ShoppingBag, label: "購物" }, { type: "Transport", icon: Train, label: "交通" }, { type: "Hotel", icon: Bed, label: "住宿" }, { type: "Other", icon: MapPin, label: "其他" }];

export default function AddActivityModal({ isOpen, onClose, onSubmit, tripId, destLat, destLng }: Props) {
  const [type, setType] = useState("Food");
  const [time, setTime] = useState("");
  const [customName, setCustomName] = useState("");
  const [googleAddress, setGoogleAddress] = useState("");
  const [note, setNote] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [refPhoto, setRefPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY; if (key) setApiKey(key); }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!supabaseUrl || !supabaseKey) { alert('Storage not configured'); return; }
    setUploading(true);
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const ext = file.name.split('.').pop();
      const path = `public/${tripId || 'tmp'}/ref-photos/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('tabi-log').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('tabi-log').getPublicUrl(path);
      setRefPhoto(data.publicUrl);
    } catch (err: any) {
      alert('上傳失敗: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = customName || googleAddress;
    if (!finalTitle) return;
    onSubmit({ type, time: time || null, location: finalTitle, address: googleAddress, note, lat, lng, refPhoto });
    setCustomName(""); setGoogleAddress(""); setNote(""); setLat(null); setLng(null); setTime(""); setRefPhoto(null); onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed inset-0 m-auto w-full max-w-md h-fit bg-white z-[101] shadow-2xl p-8 rounded-xl">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-serif font-bold tracking-widest text-[#333333]">新增活動</h2><button onClick={onClose}><X size={20} className="text-gray-400 hover:text-black"/></button></div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div><label className="block text-xs text-gray-400 mb-2">類別</label><div className="grid grid-cols-6 gap-2">{TYPES.map((t) => (<button key={t.type} type="button" onClick={() => setType(t.type)} className={clsx("flex flex-col items-center justify-center py-2 gap-1 rounded-lg border", type === t.type ? "bg-black text-white" : "bg-white text-gray-400 border-gray-100")}><t.icon size={14} /></button>))}</div></div>
              <div>
                 <label className="block text-xs text-gray-400 mb-1">活動名稱</label>
                 <input type="text" placeholder="例: Harbs 午餐" value={customName} onChange={(e) => setCustomName(e.target.value)} className="w-full border-b py-2 text-sm mb-3"/>
                 <label className="block text-xs text-gray-400 mb-1">地點搜尋 (Google)</label>
                 <div className="border-b"><GooglePlacesAutocomplete apiKey={apiKey} selectProps={{ placeholder: "搜尋...", onChange: async (val: any) => { if (!val) return; if(!customName) setCustomName(val.label.split(',')[0]); setGoogleAddress(val.label); try { const results = await geocodeByPlaceId(val.value.place_id); const { lat, lng } = await getLatLng(results[0]); setLat(lat); setLng(lng); } catch (error) {} }, styles: { control: (p) => ({ ...p, border: 'none' }), menu: (p) => ({ ...p, zIndex: 9999 }) } }} autocompletionRequest={destLat && destLng ? { location: { lat: destLat, lng: destLng }, radius: 50000 } : undefined} /></div>
                 <div className="flex items-center gap-2 mt-2"><span className={clsx("w-2 h-2 rounded-full", lat && lng ? "bg-green-500" : "bg-red-500")}/><span className="text-xs text-gray-500">{lat && lng ? `座標鎖定` : "未有座標"}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-gray-400 mb-1">時間 <span className="text-gray-300">(選填)</span></label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full border-b py-2 text-sm"/></div>
                  <div><label className="block text-xs text-gray-400 mb-1">備註</label><input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="w-full border-b py-2 text-sm" placeholder="選填..."/></div>
              </div>

              {/* Reference photo upload */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">參考圖片 <span className="text-gray-300">(選填，景點相/憑證)</span></label>
                {refPhoto ? (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-100">
                    <img src={refPhoto} className="w-full h-full object-cover"/>
                    <button type="button" onClick={() => setRefPhoto(null)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black"><X size={12}/></button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 w-full border border-dashed border-gray-200 rounded-lg py-3 px-4 text-xs text-gray-400 cursor-pointer hover:border-black hover:text-black transition-colors">
                    {uploading ? <><Loader2 size={14} className="animate-spin"/> 上傳中...</> : <><Upload size={14}/> 上傳圖片 (JPG/PNG，最大 5MB)</>}
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading}/>
                  </label>
                )}
              </div>

              <button type="submit" disabled={!customName && !googleAddress} className={clsx("w-full py-3 rounded-lg text-xs font-bold uppercase mt-2", (!customName && !googleAddress) ? "bg-gray-300 cursor-not-allowed" : "bg-black text-white")}>確認新增</button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}