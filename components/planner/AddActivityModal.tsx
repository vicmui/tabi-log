"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Utensils, Camera, Train, Bed, ShoppingBag, MapPin, ArrowRightLeft } from "lucide-react";
import GooglePlacesAutocomplete, { geocodeByPlaceId, getLatLng } from 'react-google-places-autocomplete';
import clsx from "clsx";

interface Props { isOpen: boolean; onClose: () => void; onSubmit: (data: any) => void; }
const TYPES = [{ type: "Food", icon: Utensils, label: "美食" }, { type: "Sightseeing", icon: Camera, label: "景點" }, { type: "Shopping", icon: ShoppingBag, label: "購物" }, { type: "Transport", icon: Train, label: "交通" }, { type: "Hotel", icon: Bed, label: "住宿" }, { type: "Other", icon: MapPin, label: "其他" }];

export default function AddActivityModal({ isOpen, onClose, onSubmit }: Props) {
  const [type, setType] = useState("Food");
  const [time, setTime] = useState("10:00");
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");
  const [cost, setCost] = useState(""); // 改用 String
  const [currency, setCurrency] = useState("JPY"); // 新增
  const [note, setNote] = useState("");
  const [isGoogleMode, setIsGoogleMode] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  // 匯率 (暫時寫死 0.052，或者你可以從 props 傳入 trip.rate)
  const rate = 0.052; 

  useEffect(() => { const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY; if (key) setApiKey(key); else setIsGoogleMode(false); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationName) return;
    
    let finalCost = Number(cost);
    if (currency === "HKD") finalCost = Math.round(Number(cost) / rate);

    const finalNote = note ? note : address ? `📍 ${address}` : "";
    onSubmit({ type, time, location: locationName, cost: finalCost, note: finalNote, lat, lng });
    setLocationName(""); setAddress(""); setCost(""); setNote(""); setLat(null); setLng(null); onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed inset-0 m-auto w-full max-w-md h-fit bg-white z-[101] shadow-2xl p-8 rounded-xl">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-serif font-bold tracking-widest text-[#333333]">新增活動</h2><button onClick={onClose}><X size={20} className="text-gray-400 hover:text-black"/></button></div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div><label className="block text-[10px] font-bold text-gray-400 tracking-widest mb-2 uppercase">類別</label><div className="grid grid-cols-6 gap-2">{TYPES.map((t) => (<button key={t.type} type="button" onClick={() => setType(t.type)} className={clsx("flex flex-col items-center justify-center py-2 gap-1 rounded-lg transition-all border", type === t.type ? "bg-[#333333] text-white border-black" : "bg-white text-gray-400 border-gray-100 hover:border-gray-300")}><t.icon size={14} /></button>))}</div></div>
              <div><div className="flex justify-between items-center mb-2"><label className="block text-[10px] font-bold text-gray-400 tracking-widest uppercase">地點</label>{apiKey && (<button type="button" onClick={() => setIsGoogleMode(!isGoogleMode)} className="text-[10px] text-blue-500 underline">{isGoogleMode ? "切換手動" : "Google 搜尋"}</button>)}</div>{isGoogleMode && apiKey ? (<div className="border-b border-gray-200"><GooglePlacesAutocomplete apiKey={apiKey} selectProps={{ placeholder: "搜尋...", onChange: async (val: any) => { if (!val) return; const results = await geocodeByPlaceId(val.value.place_id); const { lat, lng } = await getLatLng(results[0]); setLocationName(val.label.split(',')[0]); setAddress(val.label); setLat(lat); setLng(lng); }, styles: { control: (p) => ({ ...p, border: 'none', boxShadow: 'none' }), menu: (p) => ({ ...p, zIndex: 9999 }) } }} /></div>) : (<input type="text" placeholder="手動輸入..." value={locationName} onChange={(e) => setLocationName(e.target.value)} className="w-full border-b py-2 text-sm" autoFocus/>)}{address && isGoogleMode && <p className="text-[10px] text-gray-400 mt-1 truncate">{address}</p>}</div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold text-gray-400 tracking-widest mb-1 uppercase">時間</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full border-b border-gray-200 py-2 text-sm"/></div>
                
                {/* 🔥 幣值輸入 */}
                <div>
                   <label className="block text-[10px] font-bold text-gray-400 tracking-widest mb-1 uppercase">預算</label>
                   <div className="flex items-center border-b border-gray-200">
                       <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="w-full py-2 text-sm focus:outline-none" placeholder="0"/>
                       <button type="button" onClick={()=>setCurrency(currency==="JPY"?"HKD":"JPY")} className="text-[10px] font-bold px-2 bg-gray-100 rounded flex items-center gap-1">{currency} <ArrowRightLeft size={8}/></button>
                   </div>
                   {currency === "HKD" && cost && <p className="text-[9px] text-gray-400 text-right mt-1">≈ ¥{Math.round(Number(cost)/rate).toLocaleString()}</p>}
                </div>
              </div>

              <div><label className="block text-[10px] font-bold text-gray-400 tracking-widest mb-1 uppercase">備註</label><input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="w-full border-b border-gray-200 py-2 text-sm" placeholder="選填..."/></div>
              <button type="submit" className="w-full bg-[#333333] text-white py-3 rounded-lg text-xs font-bold tracking-widest uppercase">確認新增</button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}