"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { RefreshCw, ArrowRightLeft, Download, Upload, Save, AlertTriangle } from "lucide-react";
import { useTripStore } from "@/store/useTripStore";

export default function ToolboxPage() {
  const [jpy, setJpy] = useState<string>("");
  const [hkd, setHkd] = useState<string>("");
  const [rate, setRate] = useState(0.052);
  
  // 🔥 引入 importData 函數
  const { trips, importData } = useTripStore(); 
  const [importStatus, setImportStatus] = useState("");

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

  const handleExport = () => {
    const dataStr = JSON.stringify(trips, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vm-build-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          // 🔥 關鍵修正：直接呼叫 Store 的 action
          importData(json);
          
          setImportStatus("匯入成功！資料已更新。");
          // 不需要 reload，因為 React 狀態更新後畫面會自動變
        } else {
          setImportStatus("格式錯誤：檔案不是有效的行程資料。");
        }
      } catch (err) {
        setImportStatus("匯入失敗：檔案損毀。");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-8 md:p-12 overflow-y-auto h-screen bg-gray-50">
        <header className="mb-10"><h1 className="text-3xl font-serif font-bold tracking-widest uppercase mb-2">旅行工具</h1></header>

        <div className="grid grid-cols-1 gap-12 max-w-4xl">
          <div className="space-y-6">
             <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
                <RefreshCw size={16} className="text-jp-charcoal"/>
                <h2 className="text-xs font-bold tracking-[0.2em] uppercase">匯率計算機</h2>
             </div>
             <div className="bg-white p-8 border border-gray-100 shadow-sm space-y-8">
                <div className="flex flex-col gap-2">
                   <div className="flex justify-between text-[10px] text-gray-400 tracking-widest uppercase"><span>Rate</span><span>1 JPY = {rate} HKD</span></div>
                   <input type="range" min="0.040" max="0.070" step="0.001" value={rate} onChange={(e) => setRate(parseFloat(e.target.value))} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"/>
                </div>
                <div className="space-y-8">
                   <div className="relative group">
                      <label className="text-[10px] font-bold text-gray-400 tracking-widest uppercase absolute -top-3 left-0">JPY</label>
                      <input type="number" value={jpy} onChange={(e) => handleJpyChange(e.target.value)} placeholder="0" className="w-full bg-transparent border-b border-gray-200 text-5xl font-serif py-2 focus:outline-none focus:border-black" />
                   </div>
                   <div className="flex justify-center text-gray-300"><ArrowRightLeft size={24} className="rotate-90"/></div>
                   <div className="relative group">
                      <label className="text-[10px] font-bold text-gray-400 tracking-widest uppercase absolute -top-3 left-0">HKD</label>
                      <input type="number" value={hkd} onChange={(e) => handleHkdChange(e.target.value)} placeholder="0" className="w-full bg-transparent border-b border-gray-200 text-5xl font-serif py-2 focus:outline-none focus:border-black" />
                   </div>
                </div>
             </div>
          </div>

          <div className="space-y-6">
             <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
                <Save size={16} className="text-jp-charcoal"/>
                <h2 className="text-xs font-bold tracking-[0.2em] uppercase">資料備份</h2>
             </div>
             <div className="bg-white p-8 border border-gray-100 shadow-sm">
                <p className="text-sm text-gray-500 mb-6">將行程資料匯出備份，或匯入以恢復資料。</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <button onClick={handleExport} className="flex items-center justify-center gap-2 border border-black bg-black text-white py-4 text-xs font-bold tracking-widest uppercase hover:opacity-80"><Download size={16} /> 匯出資料</button>
                   <label className="flex items-center justify-center gap-2 border border-gray-300 text-jp-charcoal py-4 text-xs font-bold tracking-widest uppercase hover:bg-gray-50 cursor-pointer">
                      <Upload size={16} /> 匯入資料
                      <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                   </label>
                </div>
                {importStatus && <div className="mt-4 p-3 bg-gray-50 text-xs text-center font-bold text-blue-600 flex items-center justify-center gap-2"><AlertTriangle size={14}/> {importStatus}</div>}
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}