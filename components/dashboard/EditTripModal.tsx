"use client";
import { useState } from "react";
import { useTripStore } from "@/store/useTripStore";
import { X, Upload, ImagePlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from 'uuid';
import { AlertDialog } from "@/components/ui/Dialog";
import { RepositionPanel, CoverFocus } from "@/components/ui/RepositionPanel";
import { COMMON_CURRENCIES, homeOf, localOf, symbolOf } from "@/lib/money";

export default function EditTripModal({ trip, onClose }: any) {
  const { updateTripSettings, updateTrip } = useTripStore();
  const [title, setTitle]           = useState(trip.title);
  const [startDate, setStartDate]   = useState(trip.startDate);
  // 這兩個欄位一直沒有介面可以設定，所以永遠是 undefined，
  // 記帳頁的符號便一路退回預設值，顯示成港元、數字卻是日圓。
  const [homeCurrency, setHomeCurrency]   = useState(homeOf(trip));
  const [localCurrency, setLocalCurrency] = useState(localOf(trip));
  const [fxRate, setFxRate]               = useState(String(trip.exchangeRate ?? 0.052));
  const [coverImage, setCoverImage] = useState(trip.coverImage || '');
  // 焦點存喺 trip 資料本身；舊版存喺 localStorage，一併讀返做 fallback
  const legacyY = (() => { try { const m = localStorage.getItem(`coverPos-trip-${trip.id}`); return m ? Number(m) : undefined; } catch { return undefined; } })();
  const [focus, setFocus] = useState<CoverFocus>({
    x: trip.coverPosX ?? 50,
    y: trip.coverPosY ?? legacyY ?? 50,
  });
  const [uploading, setUploading]   = useState(false);
  const [repositioning, setRepositioning] = useState(false);
  const [alertMsg, setAlertMsg]     = useState<string | null>(null);

  const saveFocus = (f: CoverFocus) => {
    setFocus(f);
    updateTrip(trip.id, { coverPosX: f.x, coverPosY: f.y });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const filePath = `public/${trip.id}/covers/${uuidv4()}-${file.name}`;
    const { error } = await supabase.storage.from('trip_files').upload(filePath, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('trip_files').getPublicUrl(filePath);
      setCoverImage(publicUrl);
      saveFocus({ x: 50, y: 50 });
      setRepositioning(true);   // auto-open reposition after upload
    } else {
      setAlertMsg("封面上傳失敗，請重試。");
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleSave = () => {
    updateTripSettings(trip.id, title, startDate, coverImage);
    updateTrip(trip.id, {
      homeCurrency,
      localCurrency,
      exchangeRate: Number(fxRate) || trip.exchangeRate || 0.052,
    });
    // coverPosY is already saved to localStorage in savePosY()
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-neutral-200 p-8 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black"><X size={20} /></button>
        <h2 className="font-light text-xl mb-6 tracking-widest uppercase">編輯旅程</h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">旅程名稱</label>
            <input className="w-full border-b p-2 focus:outline-none focus:border-black" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          {/* Start date */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">開始日期</label>
            <input type="date" className="w-full border-b p-2 focus:outline-none focus:border-black" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>

          {/* 貨幣設定 */}
          <div>
            <label className="text-xs text-gray-500 block mb-2">貨幣</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] text-gray-500 mb-1">當地貨幣</p>
                <select
                  value={localCurrency}
                  onChange={e => setLocalCurrency(e.target.value)}
                  className="w-full border-b p-2 text-sm bg-transparent focus:outline-none focus:border-black"
                >
                  {Array.from(new Set([localCurrency, ...COMMON_CURRENCIES])).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 mb-1">結算貨幣（預算／總計）</p>
                <select
                  value={homeCurrency}
                  onChange={e => setHomeCurrency(e.target.value)}
                  className="w-full border-b p-2 text-sm bg-transparent focus:outline-none focus:border-black"
                >
                  {Array.from(new Set([homeCurrency, ...COMMON_CURRENCIES])).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-[11px] text-gray-500 mb-1">
                1 {localCurrency} = ? {homeCurrency}
              </p>
              <input
                type="number"
                step="0.0001"
                value={fxRate}
                onChange={e => setFxRate(e.target.value)}
                className="w-full border-b p-2 text-sm focus:outline-none focus:border-black"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                {Number(fxRate) > 0 && (
                  <>1,000 {localCurrency} ≈ {symbolOf(homeCurrency)}{(Number(fxRate) * 1000).toFixed(0)}　</>
                )}
                改動只影響之後新增的支出，已記錄的帳按當時匯率保留。
              </p>
            </div>
          </div>

          {/* Cover image */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="text-xs text-gray-500">封面圖片</label>
              {/* ✅ Size reminder */}
              <span className="text-[11px] text-gray-500">建議 <span className="font-medium text-gray-700">2000×1000px</span>（2:1 橫向）</span>
            </div>

            {/* ✅ Reposition slider (inline, compact) */}
            {repositioning && coverImage ? (
              <RepositionPanel
                compact
                src={coverImage}
                initial={focus}
                aspect={1.5}
                onConfirm={f => { saveFocus(f); setRepositioning(false); }}
                onCancel={() => setRepositioning(false)}
              />
            ) : (
              <div className="w-full bg-gray-100 overflow-hidden relative group" style={{ aspectRatio: "1.5" }}>
                {coverImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverImage} alt="cover"
                      className="w-full h-full object-cover"
                      style={{ objectPosition: `${focus.x}% ${focus.y}%` }}
                    />
                    {/* Controls — always visible on mobile, hover on desktop */}
                    <div className="absolute inset-0 bg-black/30 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        onClick={() => setRepositioning(true)}
                        className="flex items-center gap-1.5 bg-white text-black text-xs font-medium uppercase tracking-widest px-3 py-1.5"
                      >
                        調整位置
                      </button>
                      <label className="flex items-center gap-1.5 bg-white text-black text-xs font-medium uppercase tracking-widest px-3 py-1.5 cursor-pointer">
                        <Upload size={11} /> 更換
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                      </label>
                    </div>
                  </>
                ) : (
                  /* Empty state with prominent reminder */
                  <label className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-50 to-gray-100 cursor-pointer hover:from-gray-100 hover:to-gray-200 transition-colors border border-dashed border-gray-200">
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                    {uploading ? (
                      <span className="text-xs text-gray-500 animate-pulse">上傳中...</span>
                    ) : (
                      <>
                        <div className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center">
                          <ImagePlus size={18} className="text-gray-500" />
                        </div>
                        <div className="text-center">
                          <p className="text-[11px] font-medium text-gray-500 tracking-widest uppercase">上傳封面</p>
                          <p className="text-xs text-gray-500 mt-0.5"><span className="font-medium text-gray-700">2000 × 1000px</span> · JPG / PNG</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">主體置中，上傳後可左右上下調整焦點</p>
                        </div>
                      </>
                    )}
                  </label>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons — hidden during repositioning so layout stays clean */}
        {!repositioning && (
          <div className="flex gap-4 mt-8">
            <button onClick={onClose} className="flex-1 border border-gray-200 py-3 text-xs tracking-widest uppercase hover:bg-gray-50 transition-colors">取消</button>
            <button onClick={handleSave} className="flex-1 bg-black text-white py-3 text-xs tracking-widest uppercase hover:bg-gray-800 transition-colors">儲存</button>
          </div>
        )}
      </div>
      <AlertDialog isOpen={!!alertMsg} message={alertMsg || ""} onClose={() => setAlertMsg(null)} />
    </div>
  );
}
