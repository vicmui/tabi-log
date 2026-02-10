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
  const [customName, setCustomName] = useState("");
  const [googleAddress, setGoogleAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [cost, setCost] = useState(""); 
  const [currency, setCurrency] = useState("JPY"); 
  const [note, setNote] = useState("");
  const [isGoogleMode, setIsGoogleMode] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const rate = 0.052; 

  useEffect(() => { const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY; if (key) setApiKey(key); else setIsGoogleMode(false); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = customName || googleAddress;
    if (!finalTitle) return;
    
    let finalCost = Number(cost);
    if (currency === "HKD") finalCost = Math.round(Number(cost) / rate);

    const finalNote = note ? note : addressDetail ? `📍 ${addressDetail}` : "";

    // Debug Log (你可以打開 Console 看看有沒有數值)
    console.log("Saving Activity:", { lat, lng, location: finalTitle });

    onSubmit({ 
        type, 
        time, 
        location: finalTitle, 
        address: googleAddress + (addressDetail ? ` (${addressDetail})` : ""), 
        cost: finalCost, 
        note: finalNote, 
        lat, 
        lng 
    });
    
    setCustomName(""); setGoogleAddress(""); setAddressDetail(""); setCost(""); setNote(""); setLat(null); setLng(null); onClose();
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
              
              <div>
                 <label className="block text-[10px] font-bold text-gray-400 tracking-widest mb-1 uppercase">活動名稱 (自訂)</label>
                 <input type="text" placeholder="例: Harbs 午餐" value={customName} onChange={(e) => setCustomName(e.target.value)} className="w-full border-b border-gray-200 py-2 text-sm focus:outline-none focus:border-black mb-3"/>
                 
                 <div className="flex justify-between items-center mb-1"><label className="block text-[10px] font-bold text-gray-400 tracking-widest uppercase">地點搜尋 (Google)</label>{apiKey && (<button type="button" onClick={() => setIsGoogleMode(!isGoogleMode)} className="text-[10px] text-blue-500 underline">{isGoogleMode ? "切換手動" : "開啟搜尋"}</button>)}</div>
                 {isGoogleMode && apiKey ? (<div className="border-b border-gray-200">
                     <GooglePlacesAutocomplete apiKey={apiKey} selectProps={{ 
                         placeholder: "搜尋地點 (取得座標)...",
                         onChange: async (val: any) => { 
                             if (!val) return; 
                             if(!customName) setCustomName(val.label.split(',')[0]);
                             setGoogleAddress(val.label); 
                             setAddressDetail(val.label);
                             
                             // 🔥 獲取經緯度
                             try {
                                const results = await geocodeByPlaceId(val.value.place_id); 
                                const { lat, lng } = await getLatLng(results[0]); 
                                setLat(lat); setLng(lng); 
                             } catch (error) {
                                console.error("Geocoding error:", error);
                             }
                         }, 
                         styles: { control: (p) => ({ ...p, border: 'none', boxShadow: 'none' }), menu: (p) => ({ ...p, zIndex: 9999 }) } 
                     }} />
                 </div>) : (<input type="text" placeholder="手動輸入地址..." value={googleAddress} onChange={(e) => setGoogleAddress(e.target.value)} className="w-full border-b py-2 text-sm" />)}
                 {lat && lng && <p className="text-[10px] text-green-600 mt-1">✅ 已取得座標</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold text-gray-400 tracking-widest mb-1 uppercase">時間</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full border-b border-gray-200 py-2 text-sm"/></div>
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
              
              <button type="submit" disabled={!customName && !googleAddress} className={clsx("w-full py-3 rounded-lg text-xs font-bold tracking-widest uppercase mt-2 transition-all", (!customName && !googleAddress) ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-[#333333] text-white hover:bg-black shadow-lg active:scale-95")}>
                確認新增
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}