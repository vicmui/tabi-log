"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Utensils, Camera, Train, Bed, ShoppingBag, MapPin } from "lucide-react";
import GooglePlacesAutocomplete, { geocodeByPlaceId, getLatLng } from 'react-google-places-autocomplete';
import clsx from "clsx";

interface Props { isOpen: boolean; onClose: () => void; onSubmit: (data: any) => void; }
const TYPES = [{ type: "Food", icon: Utensils, label: "美食" }, { type: "Sightseeing", icon: Camera, label: "景點" }, { type: "Shopping", icon: ShoppingBag, label: "購物" }, { type: "Transport", icon: Train, label: "交通" }, { type: "Hotel", icon: Bed, label: "住宿" }, { type: "Other", icon: MapPin, label: "其他" }];

export default function AddActivityModal({ isOpen, onClose, onSubmit }: Props) {
  const [type, setType] = useState("Food");
  const [time, setTime] = useState("10:00");
  const [customName, setCustomName] = useState("");
  const [googleAddress, setGoogleAddress] = useState("");
  const [note, setNote] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  useEffect(() => { const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY; if (key) setApiKey(key); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = customName || googleAddress;
    if (!finalTitle) return;
    onSubmit({ type, time, location: finalTitle, address: googleAddress, note, lat, lng });
    setCustomName(""); setGoogleAddress(""); setNote(""); setLat(null); setLng(null); onClose();
  };

  const canSubmit = !!(customName || googleAddress);
  const selectedType = TYPES.find(t => t.type === type);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="fixed inset-0 m-auto w-full max-w-md h-fit bg-white z-[101] shadow-2xl rounded-2xl overflow-hidden"
          >
            {/* Header strip — shows selected category color accent */}
            <div className="h-1 w-full bg-neutral-900" />

            <div className="p-7">
              {/* Title row */}
              <div className="flex justify-between items-center mb-7">
                <div>
                  <p className="text-[9px] tracking-[0.25em] text-gray-400 uppercase mb-1">新增活動</p>
                  <h2 className="text-lg font-serif font-bold tracking-tight text-neutral-900 leading-none">
                    {selectedType?.label ?? "活動"} ·{" "}
                    <span className="text-gray-400 font-light">{time}</span>
                  </h2>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                  <X size={16} className="text-gray-400"/>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Category picker — icon + label */}
                <div>
                  <label className="block text-[9px] tracking-[0.2em] text-gray-400 uppercase mb-2.5">類別</label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {TYPES.map((t) => (
                      <button
                        key={t.type} type="button" onClick={() => setType(t.type)}
                        className={clsx(
                          "flex flex-col items-center justify-center py-2.5 gap-1 rounded-xl border transition-all",
                          type === t.type
                            ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
                            : "bg-white text-gray-300 border-gray-100 hover:border-gray-300 hover:text-gray-500"
                        )}
                      >
                        <t.icon size={14} />
                        <span className="text-[8px] tracking-wide">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Activity name */}
                <div>
                  <label className="block text-[9px] tracking-[0.2em] text-gray-400 uppercase mb-2">活動名稱</label>
                  <input
                    type="text"
                    placeholder="例：一蘭拉麵、梅田 蔦屋書店..."
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full border-b border-gray-200 py-2 text-sm text-neutral-800 placeholder:text-gray-300 focus:outline-none focus:border-neutral-800 transition-colors"
                  />
                </div>

                {/* Google Places */}
                <div>
                  <label className="block text-[9px] tracking-[0.2em] text-gray-400 uppercase mb-2">地點搜尋 (Google)</label>
                  <div className="border-b border-gray-200 focus-within:border-neutral-800 transition-colors">
                    <GooglePlacesAutocomplete
                      apiKey={apiKey}
                      selectProps={{
                        placeholder: "搜尋地點...",
                        onChange: async (val: any) => {
                          if (!val) return;
                          if (!customName) setCustomName(val.label.split(',')[0]);
                          setGoogleAddress(val.label);
                          try {
                            const results = await geocodeByPlaceId(val.value.place_id);
                            const { lat, lng } = await getLatLng(results[0]);
                            setLat(lat); setLng(lng);
                          } catch (error) {}
                        },
                        styles: {
                          control: (p) => ({ ...p, border: 'none', boxShadow: 'none', background: 'transparent', minHeight: '36px' }),
                          menu: (p) => ({ ...p, zIndex: 9999, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }),
                          option: (p, s) => ({ ...p, fontSize: '13px', background: s.isFocused ? '#f5f5f5' : '#fff', color: '#1a1a1a' }),
                          placeholder: (p) => ({ ...p, color: '#d1d5db', fontSize: '14px' }),
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", lat && lng ? "bg-green-500" : "bg-red-400")} />
                    <span className="text-[10px] text-gray-400">{lat && lng ? "座標已鎖定" : "未有座標"}</span>
                  </div>
                </div>

                {/* Time + Note row */}
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[9px] tracking-[0.2em] text-gray-400 uppercase mb-2">時間</label>
                    <input
                      type="time" value={time} onChange={(e) => setTime(e.target.value)}
                      className="w-full border-b border-gray-200 py-2 text-sm text-neutral-800 focus:outline-none focus:border-neutral-800 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] tracking-[0.2em] text-gray-400 uppercase mb-2">備註</label>
                    <input
                      type="text" value={note} onChange={(e) => setNote(e.target.value)}
                      placeholder="選填..." 
                      className="w-full border-b border-gray-200 py-2 text-sm text-neutral-800 placeholder:text-gray-300 focus:outline-none focus:border-neutral-800 transition-colors"
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit" disabled={!canSubmit}
                  className={clsx(
                    "w-full py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] rounded-xl transition-all",
                    canSubmit
                      ? "bg-neutral-900 text-white hover:bg-black active:scale-[0.99]"
                      : "bg-gray-100 text-gray-300 cursor-not-allowed"
                  )}
                >
                  確認新增
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}