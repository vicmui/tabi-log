"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TripSwitcher from "@/components/layout/TripSwitcher";
import { RefreshCw, ArrowRightLeft, Download, Upload, Save, AlertTriangle, Loader2, CheckCircle2, Wifi, WifiOff } from "lucide-react";
import { useTripStore } from "@/store/useTripStore";

// Common travel currencies for quick select
const POPULAR_CURRENCIES = ["JPY", "HKD", "USD", "TWD", "KRW", "SGD", "GBP", "EUR", "THB", "MYR", "AUD"];

export default function ToolboxPage() {
  const { trips, activeTripId, importData, updateTripRate } = useTripStore();
  const trip = activeTripId ? trips.find(t => t.id === activeTripId) : trips[0];

  const [amount, setAmount] = useState<string>("");
  const [rate, setRate] = useState(0.052);
  const [currencyFrom, setCurrencyFrom] = useState("JPY");
  const [currencyTo, setCurrencyTo] = useState("HKD");
  const [isFetching, setIsFetching] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [importStatus, setImportStatus] = useState("");

  useEffect(() => {
    if (trip?.exchangeRate) setRate(trip.exchangeRate);
  }, [trip]);

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    if (trip) updateTripRate(trip.id, newRate);
  };

  // 🔥 Auto-fetch live exchange rate — works for ANY currency pair
  const fetchLiveRate = async () => {
    setIsFetching(true);
    setFetchError(false);
    try {
      // open.er-api.com: free, no API key, 170+ currencies
      const res = await fetch(`https://open.er-api.com/v6/latest/${currencyFrom}`);
      const data = await res.json();
      if (data.result === "success" && data.rates[currencyTo]) {
        const liveRate = data.rates[currencyTo];
        handleRateChange(parseFloat(liveRate.toFixed(6)));
        const now = new Date();
        setLastUpdated(`${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`);
      } else {
        setFetchError(true);
      }
    } catch {
      setFetchError(true);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSwap = () => {
    setCurrencyFrom(currencyTo);
    setCurrencyTo(currencyFrom);
    setRate(rate !== 0 ? parseFloat((1 / rate).toFixed(6)) : rate);
    handleRateChange(rate !== 0 ? parseFloat((1 / rate).toFixed(6)) : rate);
    setLastUpdated(null);
  };

  const result = amount ? (parseFloat(amount) * rate).toFixed(2) : "0";

  const handleExport = () => {
    const dataStr = JSON.stringify(trips, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vm-build-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) { importData(json); setImportStatus("匯入成功！"); }
        else setImportStatus("格式錯誤");
      } catch { setImportStatus("匯入失敗"); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-8 md:p-12 overflow-y-auto h-screen bg-gray-50 pb-24">
        <header className="mb-10">
          <h1 className="text-3xl font-serif font-bold tracking-widest uppercase mb-2">旅行工具</h1>
          <div className="flex items-center gap-4"><TripSwitcher /></div>
        </header>

        <div className="grid grid-cols-1 gap-12 max-w-4xl">
          {/* ── 匯率計算機 ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
              <RefreshCw size={16} />
              <h2 className="text-xs font-bold tracking-[0.2em] uppercase">匯率計算機</h2>
            </div>

            <div className="bg-white p-8 border border-gray-100 space-y-6">
              {/* Currency selector */}
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-[9px] text-gray-400 block mb-1 tracking-widest uppercase">From</label>
                  <input
                    value={currencyFrom}
                    onChange={e => { setCurrencyFrom(e.target.value.toUpperCase()); setLastUpdated(null); }}
                    className="w-full border-b text-2xl font-black p-1 uppercase focus:outline-none focus:border-black"
                  />
                </div>
                <button onClick={handleSwap} className="text-gray-300 mb-2 hover:text-black transition-colors">
                  <ArrowRightLeft size={20} />
                </button>
                <div className="flex-1">
                  <label className="text-[9px] text-gray-400 block mb-1 tracking-widest uppercase">To</label>
                  <input
                    value={currencyTo}
                    onChange={e => { setCurrencyTo(e.target.value.toUpperCase()); setLastUpdated(null); }}
                    className="w-full border-b text-2xl font-black p-1 uppercase focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              {/* Quick currency buttons */}
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_CURRENCIES.filter(c => c !== currencyFrom).map(c => (
                  <button
                    key={c}
                    onClick={() => { setCurrencyTo(c); setLastUpdated(null); }}
                    className={`text-[9px] font-bold px-2 py-1 border tracking-widest uppercase transition-colors ${currencyTo === c ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-400 hover:border-black hover:text-black'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Rate row with live fetch button */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] text-gray-400 tracking-widest uppercase">
                    1 {currencyFrom} = ? {currencyTo}
                  </span>
                  <div className="flex items-center gap-2">
                    {lastUpdated && !fetchError && (
                      <span className="text-[9px] text-gray-400 flex items-center gap-1">
                        <CheckCircle2 size={10} className="text-green-500" /> 即時匯率 {lastUpdated}
                      </span>
                    )}
                    {fetchError && (
                      <span className="text-[9px] text-red-400 flex items-center gap-1">
                        <WifiOff size={10} /> 網絡錯誤
                      </span>
                    )}
                    <button
                      onClick={fetchLiveRate}
                      disabled={isFetching}
                      className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase border border-gray-200 px-3 py-1.5 hover:border-black hover:text-black transition-colors disabled:opacity-50"
                    >
                      {isFetching ? <Loader2 size={10} className="animate-spin" /> : <Wifi size={10} />}
                      {isFetching ? "抓取中..." : "即時匯率"}
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  value={rate}
                  onChange={e => { handleRateChange(parseFloat(e.target.value)); setLastUpdated(null); }}
                  className="w-full border border-gray-200 p-3 text-lg font-mono focus:outline-none focus:border-black"
                />
              </div>

              {/* Amount converter */}
              <div className="bg-gray-50 p-6 text-center border border-gray-100">
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="輸入金額..."
                  className="w-full bg-transparent text-center text-4xl font-bold mb-1 outline-none placeholder-gray-300"
                />
                <p className="text-[10px] text-gray-400 mb-4 tracking-widest">{currencyFrom}</p>
                <div className="h-[1px] w-10 bg-gray-300 mx-auto mb-4" />
                <p className="text-5xl font-serif font-black">{result}</p>
                <p className="text-[10px] text-gray-400 mt-2 tracking-widest">{currencyTo}</p>
              </div>
            </div>
          </div>

          {/* ── 資料備份 ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
              <Save size={16} />
              <h2 className="text-xs font-bold tracking-[0.2em] uppercase">資料備份</h2>
            </div>
            <div className="bg-white p-8 border border-gray-100">
              <p className="text-sm text-gray-500 mb-6">將行程資料匯出備份，或匯入以恢復資料。</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={handleExport} className="flex items-center justify-center gap-2 border border-black bg-black text-white py-4 text-xs font-bold tracking-widest uppercase hover:opacity-80 transition-opacity">
                  <Download size={16} /> 匯出資料
                </button>
                <label className="flex items-center justify-center gap-2 border border-gray-300 py-4 text-xs font-bold tracking-widest uppercase hover:bg-gray-50 cursor-pointer transition-colors">
                  <Upload size={16} /> 匯入資料
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
              </div>
              {importStatus && (
                <div className="mt-4 p-3 bg-gray-50 text-xs text-center font-bold flex items-center justify-center gap-2 text-gray-600">
                  <AlertTriangle size={14} /> {importStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
