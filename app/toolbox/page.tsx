"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TripSwitcher from "@/components/layout/TripSwitcher";
import { RefreshCw, ArrowRightLeft, Download, Upload, Save, AlertTriangle, WifiOff } from "lucide-react";
import Link from "next/link";
import { useTripStore } from "@/store/useTripStore";

export default function ToolboxPage() {
 const { trips, activeTripId, importData, updateTripRate } = useTripStore(); 
 const trip = activeTripId ? trips.find(t => t.id === activeTripId) : trips[0];
 
 const [amount, setAmount] = useState<string>("");
 const [rate, setRate] = useState(0.052);
 // 🔥 改：預設從 Trip 讀取，或者 Default
 const [currencyFrom, setCurrencyFrom] = useState("JPY");
 const [currencyTo, setCurrencyTo] = useState("HKD");
 const [importStatus, setImportStatus] = useState("");

 useEffect(() => {
 if (trip?.exchangeRate) setRate(trip.exchangeRate);
 }, [trip]);

 const handleRateChange = (newRate: number) => {
 setRate(newRate);
 if (trip) updateTripRate(trip.id, newRate);
 };

 const result = amount ? (parseFloat(amount) * rate).toFixed(2) : "0";

 const handleExport = () => { /* 保持不變 */ 
 const dataStr = JSON.stringify(trips, null, 2); const blob = new Blob([dataStr], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `vm-build-backup-${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
 };
 const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => { /* 保持不變 */ 
 const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { try { const json = JSON.parse(event.target?.result as string); if (Array.isArray(json)) { importData(json); setImportStatus("匯入成功！"); } else { setImportStatus("格式錯誤"); } } catch (err) { setImportStatus("匯入失敗"); } }; reader.readAsText(file);
 };

 return (
 <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
 <Sidebar />
 <main className="flex-1 ml-0 md:ml-64 p-8 md:p-12 overflow-y-auto h-screen bg-gray-50 pb-24">
 <header className="mb-10"><h1 className="text-3xl font-serif font-bold tracking-widest uppercase mb-2">旅行工具</h1><div className="flex items-center gap-4"><TripSwitcher /></div></header>
 <div className="grid grid-cols-1 gap-12 max-w-4xl">
 <div className="space-y-6">
 <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2"><RefreshCw size={16} className="text-jp-charcoal"/><h2 className="text-xs font-bold tracking-[0.2em] uppercase">匯率計算機</h2></div>
 <div className="bg-white p-8 border border-gray-100 shadow-sm space-y-8">
 <div className="flex gap-4 items-end">
 <div className="flex-1"><label className="text-[10px] text-gray-400 block mb-1">FROM</label><input value={currencyFrom} onChange={e=>setCurrencyFrom(e.target.value.toUpperCase())} className="w-full border-b text-xl font-bold p-1 uppercase focus:outline-none focus:border-black" /></div>
 <button onClick={()=>{const t=currencyFrom; setCurrencyFrom(currencyTo); setCurrencyTo(t); setRate(1/rate); handleRateChange(1/rate);}} className="text-gray-300 mb-2 hover:text-black"><ArrowRightLeft size={20} /></button>
 <div className="flex-1"><label className="text-[10px] text-gray-400 block mb-1">TO</label><input value={currencyTo} onChange={e=>setCurrencyTo(e.target.value.toUpperCase())} className="w-full border-b text-xl font-bold p-1 uppercase focus:outline-none focus:border-black" /></div>
 </div>
 <div><div className="flex justify-between text-[10px] text-gray-400 tracking-widest uppercase mb-2"><span>Rate (1 {currencyFrom} = ? {currencyTo})</span></div><input type="number" value={rate} onChange={(e) => handleRateChange(parseFloat(e.target.value))} className="w-full border p-2 rounded text-lg font-mono focus:outline-none focus:border-black" /></div>
 <div className="bg-gray-50 p-6 text-center">
 <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="輸入金額..." className="w-full bg-transparent text-center text-4xl font-bold mb-2 outline-none placeholder-gray-300" />
 <p className="text-xs text-gray-400 mb-4">{currencyFrom}</p>
 <div className="h-[1px] w-10 bg-gray-300 mx-auto mb-4"></div>
 <p className="text-5xl font-serif font-black text-jp-charcoal">{result}</p>
 <p className="text-xs text-gray-400 mt-2">{currencyTo}</p>
 </div>
 </div>
 </div>
 {/* Offline Download Section */}
 <div className="space-y-6">
 <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
 <WifiOff size={16} className="text-jp-charcoal"/>
 <h2 className="text-xs font-bold tracking-[0.2em] uppercase">離線版下載</h2>
 </div>
 <div className="bg-white p-8 border border-gray-100 shadow-sm">
 <p className="text-sm text-gray-500 mb-2">將完整行程打包成單一 HTML 檔案，無需網路即可查閱所有行程、預訂及成員資料。</p>
 <p className="text-[10px] text-gray-400 mb-6 tracking-widest uppercase">所有圖片將嵌入檔案 · 可離線使用 · 適合出行前備份</p>
 <Link
 href="/offline"
 className="inline-flex items-center gap-2 border border-black bg-black text-white px-6 py-3 text-xs font-bold tracking-widest uppercase hover:opacity-80 transition-opacity"
 >
 <WifiOff size={14} /> 前往下載離線版
 </Link>
 </div>
 </div>
 {/* Backup Section */
 <div className="space-y-6"><div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2"><Save size={16} className="text-jp-charcoal"/><h2 className="text-xs font-bold tracking-[0.2em] uppercase">資料備份</h2></div><div className="bg-white p-8 border border-gray-100 shadow-sm"><p className="text-sm text-gray-500 mb-6">將行程資料匯出備份，或匯入以恢復資料。</p><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><button onClick={handleExport} className="flex items-center justify-center gap-2 border border-black bg-black text-white py-4 text-xs font-bold tracking-widest uppercase hover:opacity-80"><Download size={16} /> 匯出資料</button><label className="flex items-center justify-center gap-2 border border-gray-300 text-jp-charcoal py-4 text-xs font-bold tracking-widest uppercase hover:bg-gray-50 cursor-pointer"><Upload size={16} /> 匯入資料<input type="file" accept=".json" onChange={handleImport} className="hidden" /></label></div>{importStatus && <div className="mt-4 p-3 bg-gray-50 text-xs text-center font-bold text-blue-600 flex items-center justify-center gap-2"><AlertTriangle size={14}/> {importStatus}</div>}</div></div>
 </div>
 </main>
 </div>
 );
}