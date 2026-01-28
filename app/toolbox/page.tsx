"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { useTripStore } from "@/store/useTripStore";
import { Check, Plus, RefreshCw, Trash2, ArrowRightLeft } from "lucide-react";
import clsx from "clsx";

// 預設清單項目
const DEFAULT_CHECKLIST = [
  "Passport (護照)",
  "Visa (簽證/Visit Japan Web)",
  "Flight Tickets (機票)",
  "Hotel Booking (酒店確認信)",
  "Japan SIM / Roaming",
  "Credit Cards / Cash (日幣)",
  "Power Bank (充電寶)",
  "Universal Adapter (轉接頭)",
];

export default function ToolboxPage() {
  const { trips, activeTripId } = useTripStore();
  const [isMounted, setIsMounted] = useState(false);
  
  // --- 匯率計算機狀態 ---
  const [jpy, setJpy] = useState<string>("");
  const [hkd, setHkd] = useState<string>("");
  const [rate, setRate] = useState(0.052); // 預設匯率 (可以手動改)

  // --- Checklist 狀態 (這裡簡化，直接存在 Component 內，進階可存入 Store) ---
  const [items, setItems] = useState<{ id: number; text: string; done: boolean }[]>([]);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    setIsMounted(true);
    // 初始化清單：如果 LocalStorage 有就讀取，沒有就用預設
    const saved = localStorage.getItem("tabi-checklist");
    if (saved) {
      setItems(JSON.parse(saved));
    } else {
      setItems(DEFAULT_CHECKLIST.map((text, i) => ({ id: i, text, done: false })));
    }
  }, []);

  // 每次 items 變動就存檔
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("tabi-checklist", JSON.stringify(items));
    }
  }, [items, isMounted]);

  // --- 匯率邏輯 ---
  const handleJpyChange = (val: string) => {
    setJpy(val);
    if (val === "") setHkd("");
    else setHkd((parseFloat(val) * rate).toFixed(2));
  };

  const handleHkdChange = (val: string) => {
    setHkd(val);
    if (val === "") setJpy("");
    else setJpy((parseFloat(val) / rate).toFixed(0));
  };

  // --- Checklist 邏輯 ---
  const toggleItem = (id: number) => {
    setItems(items.map(i => i.id === id ? { ...i, done: !i.done } : i));
  };

  const deleteItem = (id: number) => {
    setItems(items.filter(i => i.id !== id));
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    setItems([...items, { id: Date.now(), text: newItem, done: false }]);
    setNewItem("");
  };

  if (!isMounted) return null;

  return (
    <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
      <Sidebar />
      
      <main className="flex-1 ml-0 md:ml-64 p-8 md:p-12 overflow-y-auto h-screen">
        <header className="mb-12">
          <h1 className="text-3xl font-serif font-bold tracking-widest uppercase mb-2">Travel Tools</h1>
          <p className="text-xs text-gray-400 tracking-widest uppercase">
            ESSENTIALS FOR YOUR TRIP
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* ========== 1. 匯率計算機 ========== */}
          <div className="space-y-6">
             <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                <RefreshCw size={16} className="text-jp-charcoal"/>
                <h2 className="text-xs font-bold tracking-[0.2em] uppercase">Currency Converter</h2>
             </div>

             <div className="bg-gray-50 p-8 border border-gray-100 space-y-8">
                {/* 匯率設定 */}
                <div className="flex justify-end items-center gap-2 text-[10px] text-gray-400 tracking-widest">
                   <span>RATE: 1 JPY = </span>
                   <input 
                     type="number" 
                     value={rate} 
                     onChange={(e) => setRate(parseFloat(e.target.value))}
                     className="w-16 bg-transparent border-b border-gray-300 text-right text-black focus:outline-none"
                   />
                   <span>HKD</span>
                </div>

                {/* 輸入區 */}
                <div className="space-y-6">
                   <div className="relative group">
                      <label className="text-[10px] font-bold text-gray-400 tracking-widest uppercase absolute -top-3 left-0">JPY (Yen)</label>
                      <input 
                        type="number" 
                        value={jpy}
                        onChange={(e) => handleJpyChange(e.target.value)}
                        placeholder="0"
                        className="w-full bg-transparent border-b border-gray-200 text-4xl font-serif py-2 focus:outline-none focus:border-black transition-colors placeholder-gray-200"
                      />
                   </div>

                   <div className="flex justify-center text-gray-300">
                      <ArrowRightLeft size={20} className="rotate-90 lg:rotate-0"/>
                   </div>

                   <div className="relative group">
                      <label className="text-[10px] font-bold text-gray-400 tracking-widest uppercase absolute -top-3 left-0">HKD (Dollar)</label>
                      <input 
                        type="number" 
                        value={hkd}
                        onChange={(e) => handleHkdChange(e.target.value)}
                        placeholder="0"
                        className="w-full bg-transparent border-b border-gray-200 text-4xl font-serif py-2 focus:outline-none focus:border-black transition-colors placeholder-gray-200"
                      />
                   </div>
                </div>
             </div>
          </div>

          {/* ========== 2. 檢查清單 ========== */}
          <div className="space-y-6 h-full flex flex-col">
             <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                <Check size={16} className="text-jp-charcoal"/>
                <h2 className="text-xs font-bold tracking-[0.2em] uppercase">Pre-Departure Checklist</h2>
             </div>

             {/* 清單列表 */}
             <div className="flex-1 overflow-y-auto pr-2 space-y-1">
                {items.map((item) => (
                  <div 
                    key={item.id} 
                    className="group flex items-center justify-between p-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                     <div 
                       className="flex items-center gap-4 cursor-pointer flex-1"
                       onClick={() => toggleItem(item.id)}
                     >
                        <div className={clsx(
                          "w-5 h-5 border border-gray-300 flex items-center justify-center transition-all duration-300",
                          item.done ? "bg-jp-charcoal border-jp-charcoal" : "bg-white"
                        )}>
                           {item.done && <Check size={12} className="text-white" />}
                        </div>
                        <span className={clsx(
                          "text-sm tracking-wide transition-all duration-300",
                          item.done ? "text-gray-300 line-through decoration-gray-300" : "text-jp-charcoal"
                        )}>
                          {item.text}
                        </span>
                     </div>
                     <button 
                       onClick={() => deleteItem(item.id)}
                       className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                     >
                        <Trash2 size={14} />
                     </button>
                  </div>
                ))}
             </div>

             {/* 新增項目輸入框 */}
             <form onSubmit={addItem} className="relative mt-4">
                <input 
                  type="text" 
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder="ADD NEW ITEM..."
                  className="w-full bg-gray-50 px-4 py-3 pr-10 text-xs tracking-widest focus:outline-none focus:ring-1 focus:ring-black placeholder-gray-400"
                />
                <button 
                  type="submit"
                  className="absolute right-3 top-3 text-gray-400 hover:text-black transition-colors"
                >
                   <Plus size={16} />
                </button>
             </form>
          </div>

        </div>
      </main>
    </div>
  );
}