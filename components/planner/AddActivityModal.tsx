"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Utensils, Camera, Train, Bed, ShoppingBag, MapPin } from "lucide-react";
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
  const [location, setLocation] = useState("");
  const [cost, setCost] = useState(0);
  const [note, setNote] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) return;
    onSubmit({ type, time, location, cost, note });
    setLocation(""); setCost(0); setNote(""); onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed inset-0 m-auto w-full max-w-md h-fit bg-white z-[101] shadow-2xl p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-serif font-bold tracking-widest">新增活動</h2>
              <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-black"/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 tracking-widest mb-3 uppercase">類別</label>
                <div className="grid grid-cols-6 gap-2">
                  {TYPES.map((t) => (
                    <button key={t.type} type="button" onClick={() => setType(t.type)} className={clsx("flex flex-col items-center justify-center py-2 gap-1 transition-all", type === t.type ? "bg-jp-charcoal text-white" : "bg-gray-50 text-gray-400")}>
                      <t.icon size={16} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1"><label className="block text-xs font-bold text-gray-400 tracking-widest mb-2 uppercase">時間</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full border-b py-2"/></div>
                <div className="col-span-2"><label className="block text-xs font-bold text-gray-400 tracking-widest mb-2 uppercase">地點 / 店名</label><input type="text" required placeholder="地點名稱" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full border-b py-2"/></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="block text-xs font-bold text-gray-400 tracking-widest mb-2 uppercase">費用 (¥)</label><input type="number" value={cost||''} onChange={(e) => setCost(Number(e.target.value))} className="w-full border-b py-2"/></div>
                 <div><label className="block text-xs font-bold text-gray-400 tracking-widest mb-2 uppercase">備註</label><input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="w-full border-b py-2"/></div>
              </div>
              <button type="submit" className="w-full bg-jp-charcoal text-white py-4 text-xs font-bold tracking-[0.2em] hover:bg-black uppercase mt-4">確認新增</button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}