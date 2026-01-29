"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { RefreshCw, ArrowRightLeft, Download, Upload, Save, AlertTriangle } from "lucide-react";
import { useTripStore } from "@/store/useTripStore";

export default function ToolboxPage() {
  // --- 匯率狀態 ---
  const [jpy, setJpy] = useState<string>("");
  const [hkd, setHkd] = useState<string>("");
  const [rate, setRate] = useState(0.052);

  // --- 資料管理狀態 ---
  const { trips, addTrip } = useTripStore(); // 我們需要整個 Store 的狀態
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

  // 🔥 匯出功能
  const handleExport = () => {
    // 取得所有 LocalStorage 的資料
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

  // 🔥 匯入功能
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          // 強制覆寫 Store (這裡需要 Zustand 的 setState，但我們可以簡單地用一個 trick)
          // 由於 Zustand persist 會監聽 LocalStorage，我們直接寫入 LocalStorage 然後 Reload
          localStorage.setItem('vm-build-v6', JSON.stringify({ state: { trips: json, activeTripId: json[0]?.id || null }, version: 0 }));
          setImportStatus("匯入成功！正在重新整理...");
          setTimeout(() => window.location.reload(), 1000);
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
        <header className="mb-10"><h1 className="text-3xl font-serif font-bold tracking-widest uppercase mb-2">旅行工具箱</h1></header>

        <div className="grid grid-cols-1 gap-12 max-w-4xl">
          
          {/* 1. 匯率計算機 */}
          <div className="space-y-6">
             <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
                <RefreshCw size={16} className="text-jp-charcoal"/>
                <h2 className="text-xs font-bold tracking-[0.2em] uppercase">匯率計算機 (Currency)</h2>
             </div>

             <div className="bg-white p-8 border border-gray-100 shadow-sm space-y-8">
                <div className="flex flex-col gap-2">
                   <div className="flex justify-between text-[10px] text-gray-400 tracking-widest uppercase">
                      <span>Rate Setting</span>
                      <span>1 JPY = {rate} HKD</span>
                   </div>
                   <input type="range" min="0.040" max="0.070" step="0.001" value={rate} onChange={(e) => setRate(parseFloat(e.target.value))} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"/>
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

          {/* 2. 資料備份與還原 (Data Sync) */}
          <div className="space-y-6">
             <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
                <Save size={16} className="text-jp-charcoal"/>
                <h2 className="text-xs font-bold tracking-[0.2em] uppercase">資料備份 (Data Sync)</h2>
             </div>

             <div className="bg-white p-8 border border-gray-100 shadow-sm">
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                   此 App 目前使用本機儲存。若要在手機或其他裝置使用目前的行程資料，請先在此「匯出」，將檔案傳送到該裝置，然後「匯入」。
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {/* 匯出按鈕 */}
                   <button 
                     onClick={handleExport}
                     className="flex items-center justify-center gap-2 border border-black bg-black text-white py-4 text-xs font-bold tracking-widest uppercase hover:opacity-80 transition-opacity"
                   >
                      <Download size={16} /> 匯出資料 (Backup)
                   </button>

                   {/* 匯入按鈕 (隱藏 input) */}
                   <label className="flex items-center justify-center gap-2 border border-gray-300 text-jp-charcoal py-4 text-xs font-bold tracking-widest uppercase hover:bg-gray-50 transition-colors cursor-pointer relative">
                      <Upload size={16} /> 匯入資料 (Restore)
                      <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                   </label>
                </div>

                {importStatus && (
                   <div className="mt-4 p-3 bg-gray-50 text-xs text-center font-bold text-blue-600 flex items-center justify-center gap-2">
                      <AlertTriangle size={14}/> {importStatus}
                   </div>
                )}
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}