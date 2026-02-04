"use client";
import { useState, useEffect } from "react";
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
  const [locationName, setLocationName] = useState(""); // 最終地點名稱
  const [address, setAddress] = useState(""); // 詳細地址
  const [cost, setCost] = useState(0);
  const [note, setNote] = useState("");
  
  // 🔥 新增：控制 Google 模式的狀態
  const [isGoogleMode, setIsGoogleMode] = useState(true);
  const [apiKey, setApiKey] = useState("");

  // 檢查是否有 API Key
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (key) setApiKey(key);
    else setIsGoogleMode(false); // 無 Key 就強制手動
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationName) return;
    
    // 如果有地址，自動加落備註
    const finalNote = note ? note : address ? `📍 ${address}` : "";
    
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
              {/* 1. 類別 */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 tracking-widest mb-2 uppercase">類別</label>
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

              {/* 2. Google 搜尋 / 手動輸入 */}
              <div>
                 <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] font-bold text-gray-400 tracking-widest uppercase">地點 / 店名</label>
                    {/* 切換按鈕 */}
                    {apiKey && (
                        <button type="button" onClick={() => setIsGoogleMode(!isGoogleMode)} className="text-[10px] text-blue-500 underline flex items-center gap-1">
                           {isGoogleMode ? "切換手動輸入" : "🔍 使用 Google 搜尋"}
                        </button>
                    )}
                 </div>
                 
                 {isGoogleMode && apiKey ? (
                   <div className="border-b border-gray-200">
                       <GooglePlacesAutocomplete
                         apiKey={apiKey}
                         selectProps={{
                           placeholder: "輸入地點搜尋 (例: 一蘭)...",
                           onChange: (val: any) => {
                             setLocationName(val.label.split(',')[0]); // 取第一段名字
                             setAddress(val.label); // 取完整地址
                           },
                           styles: {
                             control: (provided) => ({ ...provided, border: 'none', boxShadow: 'none', padding: 0, minHeight: '36px' }),
                             placeholder: (provided) => ({ ...provided, fontSize: '14px', color: '#9ca3af', marginLeft: 0 }),
                             input: (provided) => ({ ...provided, margin: 0, padding: 0 }),
                             menu: (provided) => ({ ...provided, zIndex: 9999, fontSize: '13px' }), // 確保選單在最上層
                           }
                         }}
                       />
                   </div>
                 ) : (
                   <input 
                     type="text" 
                     placeholder="手動輸入地點名稱..." 
                     value={locationName} 
                     onChange={(e) => setLocationName(e.target.value)} 
                     className="w-full border-b border-gray-200 py-2 text-sm focus:outline-none focus:border-black transition-colors" 
                     autoFocus
                   />
                 )}
                 {address && isGoogleMode && <p className="text-[10px] text-gray-400 mt-1 truncate">📍 {address}</p>}
              </div>

              {/* 3. 時間與費用 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-[10px] font-bold text-gray-400 tracking-widest mb-1 uppercase">時間</label>
                   <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full border-b border-gray-200 py-2 text-sm"/>
                </div>
                <div>
                   <label className="block text-[10px] font-bold text-gray-400 tracking-widest mb-1 uppercase">預算 (¥)</label>
                   <input type="number" value={cost||''} onChange={(e) => setCost(Number(e.target.value))} className="w-full border-b border-gray-200 py-2 text-sm" placeholder="0"/>
                </div>
              </div>

              {/* 4. 備註 */}
              <div>
                 <label className="block text-[10px] font-bold text-gray-400 tracking-widest mb-1 uppercase">備註</label>
                 <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="w-full border-b border-gray-200 py-2 text-sm" placeholder="選填..."/>
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