"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Utensils, Camera, Train, Bed, ShoppingBag, MapPin, Search } from "lucide-react";
import GooglePlacesAutocomplete from 'react-google-places-autocomplete';
import clsx from "clsx";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const TYPES = [
  { type: "Food", icon: Utensils, label: "美食" },
  { type: "Sightseeing", icon: Camera, label: "景點" },
  { type: "Shopping", icon: ShoppingBag, label: "購物" },
  { type: "Transport", icon: Train, label: "交通" },
  { type: "Hotel", icon: Bed, label: "住宿" },
  { type: "Other", icon: MapPin, label: "其他" },
];

export default function AddActivityModal({ isOpen, onClose, onSubmit }: Props) {
  const [type, setType] = useState("Food");
  const [time, setTime] = useState("10:00");
  const [locationName, setLocationName] = useState(""); // 用於手動輸入或 API 結果
  const [address, setAddress] = useState(""); // 儲存詳細地址
  const [cost, setCost] = useState(0);
  const [note, setNote] = useState("");
  const [isGoogleMode, setIsGoogleMode] = useState(true); // 切換模式

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationName) return;
    // 將地址自動加到備註中，如果備註是空的
    const finalNote = note ? note : address ? `地址: ${address}` : "";
    
    onSubmit({ type, time, location: locationName, cost, note: finalNote });
    
    // Reset
    setLocationName(""); setAddress(""); setCost(0); setNote(""); onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed inset-0 m-auto w-full max-w-md h-fit bg-white z-[101] shadow-2xl p-8 rounded-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-serif font-bold tracking-widest text-[#333333]">新增活動</h2>
              <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-black"/></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 1. 類型選擇 */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 tracking-widest mb-2 uppercase">類別 Category</label>
                <div className="grid grid-cols-6 gap-2">
                  {TYPES.map((t) => (
                    <button key={t.type} type="button" onClick={() => setType(t.type)} 
                      className={clsx("flex flex-col items-center justify-center py-2 gap-1 rounded-lg transition-all border", 
                      type === t.type ? "bg-[#333333] text-white border-black" : "bg-white text-gray-400 border-gray-100 hover:border-gray-300")}>
                      <t.icon size={14} />
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Google 智能搜尋 / 手動輸入 */}
              <div>
                 <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] font-bold text-gray-400 tracking-widest uppercase">地點 Location</label>
                    <button type="button" onClick={() => setIsGoogleMode(!isGoogleMode)} className="text-[10px] text-blue-500 underline">
                      {isGoogleMode ? "切換手動輸入" : "使用 Google 搜尋"}
                    </button>
                 </div>
                 
                 {isGoogleMode && process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ? (
                   <GooglePlacesAutocomplete
                     apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}
                     selectProps={{
                       placeholder: "搜尋地點 (例如: 清水寺)...",
                       onChange: (val: any) => {
                         setLocationName(val.label.split(',')[0]); // 拿第一段做名
                         setAddress(val.label); // 完整地址
                       },
                       styles: {
                         control: (provided) => ({ ...provided, border: 'none', borderBottom: '1px solid #e5e7eb', borderRadius: 0, boxShadow: 'none' }),
                         placeholder: (provided) => ({ ...provided, fontSize: '14px', color: '#9ca3af' }),
                       }
                     }}
                   />
                 ) : (
                   <input type="text" placeholder="輸入地點名稱..." value={locationName} onChange={(e) => setLocationName(e.target.value)} 
                     className="w-full border-b border-gray-200 py-2 text-sm focus:outline-none focus:border-black transition-colors" autoFocus
                   />
                 )}
                 {address && isGoogleMode && <p className="text-[10px] text-gray-400 mt-1 truncate">{address}</p>}
              </div>

              {/* 3. 時間與費用 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-[10px] font-bold text-gray-400 tracking-widest mb-1 uppercase">時間 Time</label>
                   <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full border-b border-gray-200 py-2 text-sm"/>
                </div>
                <div>
                   <label className="block text-[10px] font-bold text-gray-400 tracking-widest mb-1 uppercase">預算 (¥)</label>
                   <input type="number" value={cost||''} onChange={(e) => setCost(Number(e.target.value))} className="w-full border-b border-gray-200 py-2 text-sm" placeholder="0"/>
                </div>
              </div>

              {/* 4. 備註 */}
              <div>
                 <label className="block text-[10px] font-bold text-gray-400 tracking-widest mb-1 uppercase">備註 Note</label>
                 <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="w-full border-b border-gray-200 py-2 text-sm" placeholder="訂位代號 / 必吃清單..."/>
              </div>

              <button type="submit" className="w-full bg-[#333333] text-white py-3 rounded-lg text-xs font-bold tracking-[0.2em] hover:bg-black transition-all shadow-lg active:scale-95 uppercase mt-2">
                確認新增
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}