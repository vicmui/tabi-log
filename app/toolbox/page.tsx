"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { RefreshCw, ArrowRightLeft } from "lucide-react";

export default function ToolboxPage() {
  const [jpy, setJpy] = useState<string>("");
  const [hkd, setHkd] = useState<string>("");
  const [rate, setRate] = useState(0.052); // 預設匯率

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

  return (
    <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-8 md:p-12 overflow-y-auto h-screen bg-gray-50">
        <header className="mb-10"><h1 className="text-3xl font-serif font-bold tracking-widest uppercase mb-2">旅行工具箱</h1></header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl">
          <div className="space-y-6">
             <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
                <RefreshCw size={16} className="text-jp-charcoal"/>
                <h2 className="text-xs font-bold tracking-[0.2em] uppercase">匯率計算機 (Currency)</h2>
             </div>

             <div className="bg-white p-8 border border-gray-100 shadow-sm space-y-8">
                {/* 匯率設定 */}
                <div className="flex flex-col gap-2">
                   <div className="flex justify-between text-[10px] text-gray-400 tracking-widest uppercase">
                      <span>Rate Setting</span>
                      <span>1 JPY = {rate} HKD</span>
                   </div>
                   <input 
                     type="range" min="0.040" max="0.070" step="0.001" 
                     value={rate} onChange={(e) => setRate(parseFloat(e.target.value))}
                     className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                   />
                   <div className="flex justify-end">
                      <input 
                         type="number" value={rate} onChange={(e) => setRate(parseFloat(e.target.value))}
                         className="w-20 text-right border-b border-gray-300 text-sm focus:outline-none focus:border-black"
                      />
                   </div>
                </div>

                <div className="space-y-8">
                   <div className="relative group">
                      <label className="text-[10px] font-bold text-gray-400 tracking-widest uppercase absolute -top-3 left-0">JPY (日圓)</label>
                      <input type="number" value={jpy} onChange={(e) => handleJpyChange(e.target.value)} placeholder="0" className="w-full bg-transparent border-b border-gray-200 text-5xl font-serif py-2 focus:outline-none focus:border-black transition-colors placeholder-gray-200" />
                   </div>
                   <div className="flex justify-center text-gray-300"><ArrowRightLeft size={24} className="rotate-90"/></div>
                   <div className="relative group">
                      <label className="text-[10px] font-bold text-gray-400 tracking-widest uppercase absolute -top-3 left-0">HKD (港幣)</label>
                      <input type="number" value={hkd} onChange={(e) => handleHkdChange(e.target.value)} placeholder="0" className="w-full bg-transparent border-b border-gray-200 text-5xl font-serif py-2 focus:outline-none focus:border-black transition-colors placeholder-gray-200" />
                   </div>
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}