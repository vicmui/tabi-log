"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, CalendarRange, Check, Download, ImageIcon, Loader2, Star, X,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { Trip } from "@/store/useTripStore";
import { Recap } from "@/lib/recap";
import { formatMoney } from "@/lib/money";
import { tripPhase, tripRange, daysBetween } from "@/lib/tripPhase";
import { settlementState, suggestTransfers, computeBalances } from "@/lib/settle";
import { toDataUrl } from "@/lib/exportTripPDF";

/**
 * 旅程回顧的畫面本身。
 * 與資料讀取（app/recap/[id]/page.tsx）分開，方便單獨以測試資料檢視。
 */

const WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"];

function prettyDate(key: string): string {
  if (!key) return "";
  const d = new Date(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10)));
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日（${WEEKDAY[d.getUTCDay()]}）`;
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} 星`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={11} className={n <= value ? "fill-black text-black" : "text-gray-300"} />
      ))}
    </span>
  );
}

export default function RecapView({ trip, recap }: { trip: Trip; recap: Recap }) {
  const { start, end } = tripRange(trip);
  const phase = tripPhase(trip);
  const settle = settlementState(trip);
  const outstanding = settle === "outstanding" ? suggestTransfers(computeBalances(trip)).length : 0;
  const nights = Math.max(0, daysBetween(start, end));
  const [lightbox, setLightbox] = useState<string | null>(null);

  const maxCat = recap.byCategory[0]?.amount ?? 0;

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="flex-1 min-w-0 ml-0 md:ml-64 pb-28">
        {/* ── 封面 ─────────────────────────────────────── */}
        <div className="relative h-[46vh] min-h-[320px] w-full overflow-hidden bg-neutral-200">
          {trip.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trip.coverImage}
              alt={trip.title}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: `${trip.coverPosX ?? 50}% ${trip.coverPosY ?? 50}%` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 md:p-6 z-10">
            <Link href="/" className="flex items-center gap-1.5 bg-white/90 backdrop-blur px-3 py-2 text-[11px] tracking-widest uppercase hover:bg-white transition-colors">
              <ArrowLeft size={13} /> 首頁
            </Link>
            <div className="flex gap-2">
              <Link href={`/planner/${trip.id}`} className="flex items-center gap-1.5 bg-white/90 backdrop-blur px-3 py-2 text-[11px] tracking-widest uppercase hover:bg-white transition-colors">
                <CalendarRange size={13} /> <span className="hidden sm:inline">查看行程</span>
              </Link>
              <ShareButton trip={trip} recap={recap} />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-10 text-white">
            <p className="text-[11px] tracking-[0.3em] uppercase opacity-80 mb-2">
              {phase === "completed" ? "旅程回顧 · Travel Recap" : "旅程進度 · In Progress"}
            </p>
            <h1 className="text-3xl md:text-5xl font-semibold tracking-tight leading-tight break-words">{trip.title}</h1>
            <p className="text-xs md:text-sm tracking-widest mt-2 opacity-90">
              {start} → {end}　·　{recap.dayCount} 日 {nights} 夜
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-5 md:px-10">
          {/* ── 數字 ─────────────────────────────────────── */}
          <section className="grid grid-cols-2 md:grid-cols-4 border-b border-gray-100">
            <Stat
              label={recap.usedCheckIn ? "到訪地點" : "行程地點"}
              value={recap.usedCheckIn ? `${recap.visitedPlaces}` : `${recap.totalPlaces}`}
              sub={recap.usedCheckIn ? `共規劃 ${recap.totalPlaces} 個` : "個"}
            />
            <Stat
              label="移動距離"
              value={recap.km >= 1 ? `${recap.km.toFixed(1)}` : "—"}
              sub={recap.km >= 1 ? "公里（直線）" : "地點未有座標"}
            />
            {/* 沒有記帳時顯示「—」而非 HK$0.00：零元會被誤讀成「沒有花錢」 */}
            <Stat
              label="總開支"
              value={recap.totalSpend > 0 ? formatMoney(recap.totalSpend, recap.home) : "—"}
              sub={recap.totalSpend > 0 ? undefined : "未有記帳"}
              small
            />
            <Stat
              label="平均每日"
              value={recap.avgDailySpend > 0 ? formatMoney(recap.avgDailySpend, recap.home) : "—"}
              small
            />
          </section>

          {/* ── 最喜愛 ─────────────────────────────────── */}
          {recap.topRated.length > 0 && (
            <section className="py-12 border-b border-gray-100">
              <SectionTitle en="Favourites">最喜愛</SectionTitle>
              <div className="space-y-6">
                {recap.topRated.map(({ act, day }) => (
                  <div key={act.id} className="flex gap-4">
                    {act.photos?.[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={act.photos[0]}
                        alt={act.location}
                        onClick={() => setLightbox(act.photos![0])}
                        className="w-20 h-20 object-cover shrink-0 cursor-zoom-in"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] tracking-widest text-gray-500 uppercase mb-1">Day {day}</p>
                      <p className="text-base font-medium leading-snug break-words">{act.location}</p>
                      <div className="mt-1"><Stars value={act.rating ?? 0} /></div>
                      {act.comment && (
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed break-words">「{act.comment}」</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 每日足跡 ───────────────────────────────── */}
          <section className="py-12 border-b border-gray-100">
            <SectionTitle en="Day by Day">每日足跡</SectionTitle>
            <div className="space-y-10">
              {recap.days.map(d => (
                <div key={d.date}>
                  <div className="flex items-baseline justify-between gap-4 mb-3 pb-2 border-b border-gray-100">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold tracking-wider">Day {d.day}</span>
                      <span className="text-xs text-gray-500 ml-3">{prettyDate(d.date)}</span>
                      {d.label && <span className="text-xs text-gray-500 ml-2">· {d.label}</span>}
                    </div>
                    <span className="text-xs text-gray-500 tabular-nums shrink-0">
                      {d.spend > 0 ? formatMoney(d.spend, recap.home) : ""}
                    </span>
                  </div>

                  {d.activities.length === 0 ? (
                    <p className="text-sm text-gray-400">自由活動</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {d.activities.map(a => {
                        const dim = recap.usedCheckIn && !a.isVisited;
                        return (
                          <li key={a.id}>
                            <div className={`flex items-baseline gap-3 ${dim ? "text-gray-400" : "text-black"}`}>
                              <span className="w-11 shrink-0 text-xs font-mono tabular-nums text-gray-500">{a.time || ""}</span>
                              <span className="min-w-0 flex-1 text-sm break-words">{a.location}</span>
                              {recap.usedCheckIn && a.isVisited && <Check size={13} className="shrink-0" aria-label="已到訪" />}
                              {(a.rating ?? 0) > 0 && <Stars value={a.rating!} />}
                            </div>
                            {(a.photos?.length ?? 0) > 0 && (
                              <div className="flex gap-2 mt-2 ml-14 overflow-x-auto no-scrollbar">
                                {a.photos!.map(src => (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    key={src}
                                    src={src}
                                    alt=""
                                    onClick={() => setLightbox(src)}
                                    className="w-16 h-16 object-cover shrink-0 cursor-zoom-in"
                                  />
                                ))}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ── 開支回顧 ───────────────────────────────── */}
          {recap.totalSpend > 0 && (
            <section className="py-12 border-b border-gray-100">
              <SectionTitle en="Spending">開支回顧</SectionTitle>

              <div className="space-y-3 mb-8">
                {recap.byCategory.map(c => (
                  <div key={c.key} className="flex items-center gap-4">
                    <span className="w-12 shrink-0 text-xs text-gray-600">{c.label}</span>
                    <div className="flex-1 min-w-0 h-[3px] bg-gray-100">
                      <div className="h-full bg-black" style={{ width: `${maxCat > 0 ? (c.amount / maxCat) * 100 : 0}%` }} />
                    </div>
                    <span className="w-28 shrink-0 text-right text-sm tabular-nums">{formatMoney(c.amount, recap.home)}</span>
                  </div>
                ))}
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                {recap.peakDay && (
                  <div>
                    <dt className="text-[11px] tracking-widest uppercase text-gray-500 mb-1">開支最多的一日</dt>
                    <dd>Day {recap.peakDay.day} · {formatMoney(recap.peakDay.spend, recap.home)}</dd>
                  </div>
                )}
                {recap.biggestExpense && (
                  <div>
                    <dt className="text-[11px] tracking-widest uppercase text-gray-500 mb-1">最大一筆</dt>
                    <dd className="break-words">{recap.biggestExpense.name} · {formatMoney(recap.biggestExpense.amount, recap.home)}</dd>
                  </div>
                )}
                {trip.budgetTotal > 0 && (
                  <div>
                    <dt className="text-[11px] tracking-widest uppercase text-gray-500 mb-1">預算</dt>
                    <dd>
                      {formatMoney(trip.budgetTotal, recap.home)}
                      <span className="block text-xs text-gray-500 mt-0.5">
                        {recap.totalSpend <= trip.budgetTotal
                          ? `未超支，尚餘 ${formatMoney(trip.budgetTotal - recap.totalSpend, recap.home)}`
                          : `超支 ${formatMoney(recap.totalSpend - trip.budgetTotal, recap.home)}`}
                      </span>
                    </dd>
                  </div>
                )}
                {settle !== "none" && (
                  <div>
                    <dt className="text-[11px] tracking-widest uppercase text-gray-500 mb-1">分帳</dt>
                    <dd>
                      {settle === "settled" ? (
                        <span className="inline-flex items-center gap-1.5"><Check size={13} /> 已全部結清</span>
                      ) : (
                        <Link href="/budget" className="underline underline-offset-4 hover:no-underline">
                          尚有 {outstanding} 筆未結清 →
                        </Link>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* ── 相片 ───────────────────────────────────── */}
          {recap.photos.length > 0 && (
            <section className="py-12">
              <SectionTitle en="Photos">相片</SectionTitle>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5">
                {recap.photos.map(src => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    alt=""
                    onClick={() => setLightbox(src)}
                    className="w-full aspect-square object-cover cursor-zoom-in"
                  />
                ))}
              </div>
            </section>
          )}

          <p className="text-[11px] text-gray-500 leading-relaxed pt-6">
            移動距離為當日相鄰地點之間的直線距離總和，實際步行或乘車距離會較長。
            {recap.usedCheckIn ? "到訪地點以「打卡」紀錄為準。" : ""}
          </p>
        </div>
      </main>

      {lightbox && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button aria-label="關閉" className="absolute top-4 right-4 text-white/80 hover:text-white"><X size={24} /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, small }: { label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <div className="py-8 pr-4 min-w-0 border-t md:border-t-0 border-gray-100">
      <p className="text-[11px] tracking-[0.2em] uppercase text-gray-500 mb-2">{label}</p>
      <p className={`${small ? "text-lg md:text-xl" : "text-3xl md:text-4xl"} font-semibold tabular-nums leading-tight break-all`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children, en }: { children: React.ReactNode; en: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold tracking-wider">{children}</h2>
      <p className="text-[10px] tracking-[0.3em] uppercase text-gray-400 mt-0.5">{en}</p>
    </div>
  );
}

/**
 * 匯出回顧圖（1080 × 1350，Instagram／WhatsApp 直度比例）。
 *
 * 分兩步：先產生預覽，再按「分享」。
 * 原因同證件的離線備份一樣 —— iOS 要求 navigator.share() 在使用者手勢內即時呼叫，
 * 而 html2canvas 繪圖需時數秒，一按即分享的話，手勢授權早已過期，分享會被拒絕。
 * 預覽圖本身亦可直接長按儲存，這是 iOS 上最穩妥的後備。
 */
function ShareButton({ trip, recap }: { trip: Trip; recap: Recap }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [assets, setAssets] = useState<{ cover: string | null; photos: string[] } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true);
    setNote(null);
    try {
      // 跨網域圖片會令 canvas 被「污染」而無法輸出，所以先全部轉成 data URL
      const cover = await toDataUrl(trip.coverImage);
      const photos = (await Promise.all(recap.photos.slice(0, 3).map(u => toDataUrl(u))))
        .filter((x): x is string => !!x);
      setAssets({ cover, photos });

      // 等卡片以新素材重繪兩幀
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (document.fonts?.ready) await document.fonts.ready;

      const html2canvas = (await import("html2canvas")).default;
      const el = cardRef.current;
      if (!el) throw new Error("card not mounted");
      const canvas = await html2canvas(el, { scale: 1, backgroundColor: "#ffffff", useCORS: true, logging: false });
      const blob: Blob | null = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.92));
      if (!blob) throw new Error("toBlob failed");

      const name = `${trip.title.replace(/[\\/:*?"<>|]/g, "")}_回顧.jpg`;
      setFile(new File([blob], name, { type: "image/jpeg" }));
      setPreview(URL.createObjectURL(blob));
    } catch (e) {
      console.error("recap export failed", e);
      setNote("產生失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  };

  const share = () => {
    if (!file) return;
    const nav = navigator as any;
    if (nav.canShare?.({ files: [file] })) {
      nav.share({ files: [file], title: trip.title }).catch((e: any) => {
        if (e?.name !== "AbortError") setNote("分享未能完成，可長按圖片儲存");
      });
      return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const close = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
  };

  const { start, end } = tripRange(trip);

  return (
    <>
      <button
        onClick={generate}
        disabled={busy}
        className="flex items-center gap-1.5 bg-black text-white px-3 py-2 text-[11px] tracking-widest uppercase hover:bg-neutral-800 transition-colors disabled:opacity-60"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
        <span className="hidden sm:inline">匯出回顧圖</span>
      </button>

      {/* 離屏繪製用的卡片：放在畫面外但保持可見，html2canvas 才量度得到 */}
      <div aria-hidden style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}>
        <div
          ref={cardRef}
          style={{ width: 1080, height: 1350, background: "#fff", color: "#111", display: "flex", flexDirection: "column", fontFamily: "var(--font-inter), var(--font-noto-sans), sans-serif" }}
        >
          <div
            style={{
              height: 620,
              backgroundColor: "#ddd",
              backgroundImage: assets?.cover ? `url(${assets.cover})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: `${trip.coverPosX ?? 50}% ${trip.coverPosY ?? 50}%`,
            }}
          />
          <div style={{ padding: "56px 72px 0", flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 20, letterSpacing: 8, color: "#888", textTransform: "uppercase" }}>Travel Recap</div>
            <div style={{ fontSize: 60, fontWeight: 700, marginTop: 14, lineHeight: 1.15 }}>{trip.title}</div>
            <div style={{ fontSize: 24, letterSpacing: 3, color: "#666", marginTop: 14 }}>
              {start} → {end}　·　{recap.dayCount} 日
            </div>

            <div style={{ display: "flex", marginTop: 48, borderTop: "1px solid #e5e5e5" }}>
              {[
                [recap.usedCheckIn ? "到訪地點" : "行程地點", String(recap.usedCheckIn ? recap.visitedPlaces : recap.totalPlaces)],
                ["移動距離", recap.km >= 1 ? `${recap.km.toFixed(1)} km` : "—"],
                ["總開支", recap.totalSpend > 0 ? formatMoney(recap.totalSpend, recap.home) : "—"],
              ].map(([k, v]) => (
                <div key={k} style={{ flex: 1, paddingTop: 28 }}>
                  <div style={{ fontSize: 18, letterSpacing: 4, color: "#888" }}>{k}</div>
                  <div style={{ fontSize: 40, fontWeight: 700, marginTop: 8 }}>{v}</div>
                </div>
              ))}
            </div>

            {assets && assets.photos.length > 0 && (
              <div style={{ display: "flex", gap: 12, marginTop: 40 }}>
                {assets.photos.map((p, i) => (
                  <div key={i} style={{ flex: 1, height: 170, backgroundImage: `url(${p})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                ))}
              </div>
            )}

            <div style={{ marginTop: "auto", paddingBottom: 44, fontSize: 18, letterSpacing: 6, fontWeight: 700 }}>
              TABI LOG
            </div>
          </div>
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-medium tracking-widest uppercase">回顧圖</p>
            <button onClick={close} aria-label="關閉" className="text-gray-500 hover:text-black"><X size={20} /></button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center p-4 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="回顧圖" className="max-w-full max-h-full object-contain shadow-sm" />
          </div>
          <div className="border-t border-gray-100 px-5 py-4 space-y-2">
            <button
              onClick={share}
              className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 text-[11px] tracking-widest uppercase hover:bg-neutral-800 transition-colors"
            >
              <Download size={13} /> 分享或儲存
            </button>
            <p className="text-[11px] text-gray-500 text-center">
              {note ?? "iPhone 亦可長按圖片，選擇「加入照片」"}
            </p>
          </div>
        </div>
      )}

      {note && !preview && (
        <div role="status" className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[210] bg-black text-white text-xs px-4 py-2">
          {note}
        </div>
      )}
    </>
  );
}
