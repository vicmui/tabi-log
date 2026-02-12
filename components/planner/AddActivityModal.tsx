"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Utensils, Camera, Train, Bed, ShoppingBag, MapPin, ArrowRightLeft } from "lucide-react";
import GooglePlacesAutocomplete, { geocodeByPlaceId, getLatLng } from 'react-google-places-autocomplete';
import clsx from "clsx";

interface Props { isOpen: boolean; onClose: () => void; onSubmit: (data: any) => void; }
const TYPES = [{ type: "Food", icon: Utensils, label: "美食" }, { type: "Sightseeing", icon: Camera, label: "景點" }, { type: "Shopping", icon: ShoppingBag, label: "購物" }, { type: "Transport", icon: Train, label: "交通" }, { type: "Hotel", icon: Bed, label: "住宿" }, { type: "Other", icon: MapPin, label: "其他" }];

export default function AddActivityModal({ isOpen, onClose, onSubmit }: Props) {
  // 🔥 重要：刪除 useJsApiLoader，因為 Layout 已經載入了
  const [type, setType] = useState("Food");
  const [time, setTime] = useState("10:00");
  const [customName, setCustomName] = useState("");
  const [googleAddress, setGoogleAddress] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = customName || googleAddress;
    if (!finalTitle) return;
    onSubmit({ type, time, location: finalTitle, address: googleAddress, cost: 0, lat: Number(lat), lng: Number(lng) });
    setCustomName(""); setGoogleAddress(""); setLat(""); setLng(""); onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed inset-0 m-auto w-full max-w-md h-fit bg-white z-[101] shadow-2xl p-8 rounded-xl">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-serif font-bold tracking-widest">新增活動</h2><button onClick={onClose}><X size={20} className="text-gray-400 hover:text-black"/></button></div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div><label className="block text-[10px] font-bold text-gray-400 tracking-widest mb-2 uppercase">類別</label><div className="grid grid-cols-6 gap-2">{TYPES.map((t) => (<button key={t.type} type="button" onClick={() => setType(t.type)} className={clsx("flex flex-col items-center justify-center py-2 gap-1 rounded-lg transition-all border", type === t.type ? "bg-[#333333] text-white border-black" : "bg-white text-gray-400 border-gray-100")}><t.icon size={14} /></button>))}</div></div>
              <div>
                 <label className="block text-[10px] font-bold text-gray-400 tracking-widest mb-1 uppercase">活動名稱</label>
                 <input type="text" placeholder="例: Harbs 午餐" value={customName} onChange={(e) => setCustomName(e.target.value)} className="w-full border-b border-gray-200 py-2 text-sm focus:outline-none focus:border-black mb-3"/>
                 <div className="flex justify-between items-center mb-1"><label className="block text-[10px] font-bold text-gray-400 tracking-widest uppercase">地點搜尋 (Google)</label></div>
                 <div className="border-b border-gray-200">
                     <GooglePlacesAutocomplete apiKey={apiKey} selectProps={{ 
                         placeholder: "搜尋地點...", 
                         onChange: async (val: any) => { 
                             if (!val) return; 
                             setGoogleAddress(val.label); 
                             const results = await geocodeByPlaceId(val.value.place_id); 
                             const { lat, lng } = await getLatLng(results[0]); 
                             setLat(lat.toString()); setLng(lng.toString());
                         }, 
                         styles: { control: (p) => ({ ...p, border: 'none', boxShadow: 'none' }), menu: (p) => ({ ...p, zIndex: 9999 }) } 
                     }} />
                 </div>
                 <div className="flex gap-2 mt-2">
                     <input type="text" placeholder="緯度" value={lat} onChange={e=>setLat(e.target.value)} className="w-1/2 border-b p-1 text-xs text-gray-400" />
                     <input type="text" placeholder="經度" value={lng} onChange={e=>setLng(e.target.value)} className="w-1/2 border-b p-1 text-xs text-gray-400" />
                 </div>
              </div>
              <div><label className="block text-[10px] font-bold text-gray-400 tracking-widest mb-1 uppercase">時間</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full border-b border-gray-200 py-2 text-sm"/></div>
              <button type="submit" disabled={!customName && !googleAddress} className={clsx("w-full py-3 rounded-lg text-xs font-bold tracking-widest uppercase mt-2 transition-all", (!customName && !googleAddress) ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-[#333333] text-white hover:bg-black shadow-lg active:scale-95")}>確認新增</button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}