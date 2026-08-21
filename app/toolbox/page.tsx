"use client";
import ClientOnly from "@/components/ui/ClientOnly";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TripSwitcher from "@/components/layout/TripSwitcher";
import {
  RefreshCw, ArrowRightLeft, Loader2, CheckCircle2,
  Wifi, WifiOff, HardDrive, Signal, FileDown,
} from "lucide-react";
import { useActiveTrip } from "@/lib/useActiveTrip";
import { useTripStore } from "@/store/useTripStore";
import { exportTripPDF } from "@/lib/exportTripPDF";
import { LogoutButton } from "@/components/auth/AuthGate";

const POPULAR_CURRENCIES = ["JPY", "HKD", "USD", "TWD", "KRW", "SGD", "GBP", "EUR", "THB", "MYR", "AUD"];

export default function ToolboxPage() {
  const { updateTripRate } = useTripStore();
  const { trip } = useActiveTrip();

  const [amount, setAmount]           = useState<string>("");
  const [rate, setRate]               = useState(0.052);
  const [currencyFrom, setCurrencyFrom] = useState("JPY");
  const [currencyTo, setCurrencyTo]   = useState("HKD");
  const [isFetching, setIsFetching]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [fetchError, setFetchError]   = useState(false);
  const [cacheStatus, setCacheStatus] = useState<"idle" | "caching" | "done" | "error">("idle");
  const [cacheProgress, setCacheProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone]   = useState(false);

  useEffect(() => {
    if (trip?.exchangeRate) setRate(trip.exchangeRate);
    if (trip?.localCurrency) setCurrencyFrom(trip.localCurrency);
  }, [trip?.id]);

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    if (trip) updateTripRate(trip.id, newRate);
  };

  const fetchLiveRate = async () => {
    setIsFetching(true); setFetchError(false);
    try {
      const res  = await fetch("https://open.er-api.com/v6/latest/" + currencyFrom);
      const data = await res.json();
      if (data.result === "success" && data.rates[currencyTo]) {
        handleRateChange(parseFloat(data.rates[currencyTo].toFixed(6)));
        const now = new Date();
        setLastUpdated(`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`);
      } else { setFetchError(true); }
    } catch (_) { setFetchError(true); }
    finally { setIsFetching(false); }
  };

  const handleSwap = () => {
    const [f, t] = [currencyTo, currencyFrom];
    const newRate = rate !== 0 ? parseFloat((1 / rate).toFixed(6)) : rate;
    setCurrencyFrom(f); setCurrencyTo(t);
    setRate(newRate); handleRateChange(newRate); setLastUpdated(null);
  };

  const handlePrecacheAll = async () => {
    setCacheStatus("caching"); setCacheProgress(0);
    const routes = ["/", "/bookings", "/planner", "/budget", "/planning", "/toolbox", "/members"];
    if (trip) trip.dailyItinerary.forEach((_, i) => routes.push(`/planner/${trip.id}?day=${i}`));
    try {
      const cache = await caches.open("app-manual-cache-v1");
      let done = 0;
      for (const route of routes) {
        try { await cache.add(route); } catch (_) {}
        done++; setCacheProgress(Math.round((done / routes.length) * 100));
      }
      if (trip) {
        for (const img of trip.dailyItinerary.map(d => d.coverImage).filter((x): x is string => Boolean(x))) {
          try { await cache.add(img); } catch (_) {}
        }
      }
      setCacheStatus("done");
      setTimeout(() => { setCacheStatus("idle"); setCacheProgress(0); }, 3000);
    } catch (_) {
      setCacheStatus("error");
      setTimeout(() => setCacheStatus("idle"), 3000);
    }
  };

  const handleExportPDF = async () => {
    if (!trip || isExporting) return;
    setIsExporting(true); setExportDone(false);
    try {
      await exportTripPDF(trip);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch (e) { console.error("PDF export failed:", e); }
    finally { setIsExporting(false); }
  };

  const result = amount ? (parseFloat(amount) * rate).toFixed(2) : "0";

  // Section header component helper
  const SectionHeader = ({ icon: Icon, label }: { icon: any; label: string }) => (
    <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
      <Icon size={16} />
      <h2 className="text-xs font-bold tracking-[0.2em] uppercase">{label}</h2>
    </div>
  );

  return (
    <ClientOnly>
      <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
        <Sidebar />
        <main className="flex-1 min-w-0 ml-0 md:ml-64 p-5 sm:p-8 md:p-12 overflow-y-auto h-screen bg-gray-50 pb-24">
          <header className="mb-10">
            <h1 className="text-3xl font-serif font-bold tracking-widest uppercase mb-2">旅行工具</h1>
            <div className="flex items-center gap-4"><TripSwitcher /></div>
          </header>

          <div className="grid grid-cols-1 gap-12 max-w-4xl">

            {/* ── 匯率計算機 ─────────────────────────────────────────── */}
            <div className="space-y-4">
              <SectionHeader icon={RefreshCw} label="匯率計算機" />
              <div className="bg-white p-8 border border-gray-100 space-y-6">

                {/* Currency pair */}
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="text-[11px] text-gray-500 block mb-1 tracking-widest uppercase">From</label>
                    <input value={currencyFrom}
                      onChange={e => { setCurrencyFrom(e.target.value.toUpperCase()); setLastUpdated(null); }}
                      className="w-full border-b text-2xl font-black p-1 uppercase focus:outline-none focus:border-black" />
                  </div>
                  <button onClick={handleSwap} className="text-gray-400 mb-2 hover:text-black transition-colors">
                    <ArrowRightLeft size={20} />
                  </button>
                  <div className="flex-1">
                    <label className="text-[11px] text-gray-500 block mb-1 tracking-widest uppercase">To</label>
                    <input value={currencyTo}
                      onChange={e => { setCurrencyTo(e.target.value.toUpperCase()); setLastUpdated(null); }}
                      className="w-full border-b text-2xl font-black p-1 uppercase focus:outline-none focus:border-black" />
                  </div>
                </div>

                {/* Quick currency buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_CURRENCIES.filter(c => c !== currencyFrom).map(c => (
                    <button key={c} onClick={() => { setCurrencyTo(c); setLastUpdated(null); }}
                      className={`text-[11px] font-bold px-2 py-1 border tracking-widest uppercase transition-colors ${currencyTo === c ? "bg-black text-white border-black" : "border-gray-200 text-gray-500 hover:border-black hover:text-black"}`}>
                      {c}
                    </button>
                  ))}
                </div>

                {/* Rate row */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] text-gray-500 tracking-widest uppercase">
                      1 {currencyFrom} = ? {currencyTo}
                    </span>
                    <div className="flex items-center gap-2">
                      {lastUpdated && !fetchError && (
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <CheckCircle2 size={10} className="text-green-500" /> 即時匯率 {lastUpdated}
                        </span>
                      )}
                      {fetchError && (
                        <span className="text-[11px] text-red-400 flex items-center gap-1">
                          <WifiOff size={10} /> 網絡錯誤
                        </span>
                      )}
                      <button onClick={fetchLiveRate} disabled={isFetching}
                        className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase border border-gray-200 px-3 py-1.5 hover:border-black hover:text-black transition-colors disabled:opacity-50">
                        {isFetching ? <Loader2 size={10} className="animate-spin" /> : <Wifi size={10} />}
                        {isFetching ? "抓取中..." : "即時匯率"}
                      </button>
                    </div>
                  </div>
                  <input type="number" value={rate}
                    onChange={e => { handleRateChange(parseFloat(e.target.value)); setLastUpdated(null); }}
                    className="w-full border border-gray-200 p-3 text-lg font-mono focus:outline-none focus:border-black" />
                </div>

                {/* Amount converter */}
                <div className="bg-gray-50 p-6 text-center border border-gray-100">
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="輸入金額..."
                    className="w-full bg-transparent text-center text-4xl font-bold mb-1 outline-none placeholder-gray-300" />
                  <p className="text-xs text-gray-500 mb-4 tracking-widest">{currencyFrom}</p>
                  <div className="h-[1px] w-10 bg-gray-300 mx-auto mb-4" />
                  <p className="text-5xl font-serif font-black">{result}</p>
                  <p className="text-xs text-gray-500 mt-2 tracking-widest">{currencyTo}</p>
                </div>
              </div>
            </div>

            {/* ── 行程 PDF 導出 ───────────────────────────────────────── */}
            <div className="space-y-4">
              <SectionHeader icon={FileDown} label="行程 PDF 導出" />
              <div className="bg-white p-8 border border-gray-100 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1">一鍵匯出行程手冊</p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      將完整行程（封面、每日行程、預訂憑證）匯出成 A4 PDF。<br />
                      出發前列印或儲存至手機，上機後無網絡亦可查閱。
                    </p>
                  </div>
                </div>

                {/* Preview of what's included */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "封面頁", desc: "行程名稱 · 日期 · 統計" },
                    { label: "每日行程", desc: "時間 · 地點 · 備註 · 評分" },
                    { label: "預訂憑證", desc: "機票 · 酒店 · 票券" },
                  ].map(item => (
                    <div key={item.label} className="border border-gray-100 p-4 bg-gray-50">
                      <p className="text-[11px] font-bold tracking-widest uppercase mb-1">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Trip selector hint */}
                {!trip && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 px-4 py-3">
                    <span className="font-bold tracking-widest uppercase">請先在頂部選擇旅程</span>
                  </div>
                )}

                {exportDone && (
                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-100 px-4 py-3">
                    <CheckCircle2 size={14} />
                    <span className="font-bold tracking-widest uppercase">PDF 已成功下載！</span>
                  </div>
                )}

                <button
                  onClick={handleExportPDF}
                  disabled={!trip || isExporting}
                  className="w-full flex items-center justify-center gap-2 border border-black bg-black text-white py-4 text-xs font-bold tracking-widest uppercase hover:opacity-80 transition-opacity disabled:opacity-40"
                >
                  {isExporting ? (
                    <><Loader2 size={14} className="animate-spin" /> 生成 PDF 中，請稍候...</>
                  ) : (
                    <><FileDown size={14} /> 匯出行程 PDF</>
                  )}
                </button>

                {trip && (
                  <p className="text-[11px] text-gray-400 tracking-widest text-center uppercase">
                    當前行程：{trip.title} · {trip.dailyItinerary.length} 天 · {trip.bookings?.length ?? 0} 項預訂
                  </p>
                )}
              </div>
            </div>

            {/* ── 離線緩存 ─────────────────────────────────────────────── */}
            <div className="space-y-4">
              <SectionHeader icon={HardDrive} label="離線緩存" />
              <div className="bg-white p-8 border border-gray-100 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1">一鍵下載離線版</p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      預先緩存所有頁面至本機 — 上機後開 Airplane Mode 照用。<br />
                      行程資料存於本機，即使無網絡亦可查閱。
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 shrink-0">
                    <Signal size={10} />
                    <span className="tracking-widest uppercase">Offline Ready</span>
                  </div>
                </div>

                {cacheStatus === "caching" && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] text-gray-500 tracking-widest uppercase">
                      <span>緩存中...</span><span>{cacheProgress}%</span>
                    </div>
                    <div className="h-[2px] bg-gray-100 w-full">
                      <div className="h-full bg-black transition-all duration-300" style={{ width: cacheProgress + "%" }} />
                    </div>
                  </div>
                )}
                {cacheStatus === "done" && (
                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-100 px-4 py-3">
                    <CheckCircle2 size={14} />
                    <span className="font-bold tracking-widest uppercase">緩存完成 — 可安心開飛行模式</span>
                  </div>
                )}
                {cacheStatus === "error" && (
                  <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 border border-red-100 px-4 py-3">
                    <WifiOff size={14} />
                    <span className="font-bold tracking-widest uppercase">緩存失敗，請確保網絡正常後重試</span>
                  </div>
                )}

                <button onClick={handlePrecacheAll} disabled={cacheStatus === "caching"}
                  className="w-full flex items-center justify-center gap-2 border border-black bg-black text-white py-4 text-xs font-bold tracking-widest uppercase hover:opacity-80 transition-opacity disabled:opacity-50">
                  {cacheStatus === "caching"
                    ? <><Loader2 size={14} className="animate-spin" /> 緩存中 {cacheProgress}%</>
                    : <><HardDrive size={14} /> 立即緩存離線版</>
                  }
                </button>
                <p className="text-[11px] text-gray-400 tracking-widest text-center uppercase">
                  建議每次出發前重新緩存以獲取最新資料
                </p>
              </div>
            </div>

            <LogoutButton />

          </div>
        </main>
      </div>
    </ClientOnly>
  );
}
