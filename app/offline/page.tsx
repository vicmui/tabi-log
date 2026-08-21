"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { useTripStore, Trip } from "@/store/useTripStore";
import { Download, Wifi, WifiOff, Package, CheckCircle, AlertCircle, ChevronDown } from "lucide-react";
import clsx from "clsx";

// ── Image → base64 helper ──────────────────────────────────────────────────
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Collect all image URLs from a trip ────────────────────────────────────
function collectImageUrls(trip: Trip): string[] {
  const urls = new Set<string>();
  if (trip.coverImage) urls.add(trip.coverImage);
  trip.members.forEach(m => { if (m.avatar) urls.add(m.avatar); });
  trip.dailyItinerary.forEach(day => {
    if (day.coverImage) urls.add(day.coverImage);
    day.activities.forEach(act => {
      act.photos?.forEach(p => urls.add(p));
    });
  });
  trip.bookings.forEach(b => { if (b.details.fileUrl) urls.add(b.details.fileUrl); });
  return [...urls].filter(u => u.startsWith('http'));
}

// ── Generate the standalone offline HTML ──────────────────────────────────
async function generateOfflineHTML(
  trip: Trip,
  onProgress: (msg: string) => void
): Promise<string> {
  // 1. Collect and download all images
  const imageUrls = collectImageUrls(trip);
  const imageMap: Record<string, string> = {};
  let done = 0;

  for (const url of imageUrls) {
    onProgress(`下載圖片 ${++done}/${imageUrls.length}…`);
    const b64 = await fetchImageAsBase64(url);
    if (b64) imageMap[url] = b64;
  }

  onProgress("生成離線頁面…");

  // helper: replace any known URL with base64 in the HTML later
  const img = (src: string | undefined, cls = '', alt = '') => {
    if (!src) return '';
    const data = imageMap[src] || src;
    return `<img src="${data}" class="${cls}" alt="${alt}" loading="lazy" onerror="this.style.display='none'">`;
  };

  // ── Activity type colours ──────────────────────────────────────────────
  const typeColor: Record<string, string> = {
    Food: '#f97316', Sightseeing: '#3b82f6', Transport: '#22c55e',
    Hotel: '#a855f7', Shopping: '#ec4899', Other: '#6b7280',
  };
  const typeLabel: Record<string, string> = {
    Food: '美食', Sightseeing: '景點', Transport: '交通',
    Hotel: '住宿', Shopping: '購物', Other: '其他',
  };

  // ── Build day sections ─────────────────────────────────────────────────
  const daySections = trip.dailyItinerary.map(day => {
    const activities = (day.activities || []).filter(Boolean).map(act => {
      const photos = (act.photos || []).map(p =>
        `<div class="act-photo">${img(p, 'act-photo-img')}</div>`
      ).join('');
      const rating = act.rating
        ? `<div class="stars">${'★'.repeat(act.rating)}${'☆'.repeat(5 - act.rating)}</div>`
        : '';
      const mapLink = (act.lat && act.lng)
        ? `<a class="map-btn" href="https://www.google.com/maps/search/?api=1&query=${act.lat},${act.lng}" target="_blank">📍 地圖</a>`
        : act.address
        ? `<a class="map-btn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.address)}" target="_blank">📍 地圖</a>`
        : '';
      const navLink = act.lat && act.lng
        ? `<a class="nav-btn" href="https://www.google.com/maps/dir/?api=1&destination=${act.lat},${act.lng}&travelmode=transit" target="_blank">🗺️ 導航</a>`
        : '';
      return `
        <div class="activity">
          <div class="act-header">
            <span class="act-type" style="background:${typeColor[act.type] || '#6b7280'}20;color:${typeColor[act.type] || '#6b7280'}">${typeLabel[act.type] || act.type}</span>
            <span class="act-time">${act.time || '--:--'}</span>
            <span class="act-title">${act.location}</span>
            <span class="act-visited ${act.isVisited ? 'visited' : ''}">${act.isVisited ? '✓ 已去' : '未去'}</span>
          </div>
          ${act.address ? `<div class="act-address">📌 ${act.address}</div>` : ''}
          ${act.note ? `<div class="act-note">💬 ${act.note}</div>` : ''}
          ${rating}
          ${act.comment ? `<div class="act-comment">✍️ ${act.comment}</div>` : ''}
          <div class="act-actions">${mapLink}${navLink}</div>
          ${photos ? `<div class="act-photos">${photos}</div>` : ''}
        </div>`;
    }).join('');

    const dayCover = day.coverImage || trip.coverImage || '';
    const coverHtml = dayCover
      ? `<div class="day-cover">${img(dayCover, 'day-cover-img')}</div>`
      : '<div class="day-cover day-cover-placeholder"></div>';

    return `
      <section class="day-section" id="day-${day.day}">
        ${coverHtml}
        <div class="day-header">
          <h2 class="day-title">DAY ${day.day}</h2>
          <div class="day-meta">
            <span>📍 ${day.customLocation || '自由探索'}</span>
            <span>📅 ${day.date}</span>
          </div>
        </div>
        <div class="activities-list">${activities || '<div class="empty-day">尚未加入活動</div>'}</div>
      </section>`;
  }).join('');

  // ── Bookings ──────────────────────────────────────────────────────────
  const bookings = trip.bookings.map(b => {
    const d = b.details;
    const fileHtml = d.fileUrl
      ? `<div class="booking-file">${img(d.fileUrl, 'booking-file-img', '憑證')}</div>`
      : '';
    const detail = b.type === 'Flight'
      ? `${d.origin || '?'} → ${d.destination || '?'} &nbsp; ${d.departTime || ''} → ${d.arriveTime || ''}`
      : b.type === 'Hotel'
      ? `Check-in: ${d.checkIn || '-'}　Check-out: ${d.checkOut || '-'}`
      : d.address || '';
    return `
      <div class="booking-card">
        <div class="booking-header">
          <span class="booking-type">${b.type}</span>
          <span class="booking-title">${b.title}</span>
          <span class="booking-date">${b.date}</span>
        </div>
        <div class="booking-detail">${detail}</div>
        ${d.price ? `<div class="booking-price">💰 $${d.price}</div>` : ''}
        ${d.note ? `<div class="booking-note">📝 ${d.note}</div>` : ''}
        ${fileHtml}
      </div>`;
  }).join('') || '<div class="empty-section">尚未加入預訂</div>';

  // ── Members ───────────────────────────────────────────────────────────
  const members = trip.members.map(m => `
    <div class="member-card">
      ${img(m.avatar, 'member-avatar', m.name)}
      <span class="member-name">${m.name}</span>
    </div>`).join('') || '<div class="empty-section">尚未加入成員</div>';

  // ── Trip stats ────────────────────────────────────────────────────────
  const totalActs = trip.dailyItinerary.reduce((s, d) => s + (d.activities?.length || 0), 0);
  const visitedActs = trip.dailyItinerary.reduce((s, d) => s + (d.activities?.filter(a => a?.isVisited)?.length || 0), 0);

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${trip.title} — 離線旅程手帳</title>
<style>
  :root { --black:#1a1a1a; --gray:#6b7280; --light:#f5f5f5; --border:#e5e7eb; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:var(--black); background:#fff; }
  a { color:var(--black); }

  /* ── Nav ── */
  .nav { position:sticky; top:0; background:#fff; border-bottom:1px solid var(--border); z-index:100;
         display:flex; align-items:center; gap:0; overflow-x:auto; padding:0 16px; }
  .nav-btn-tab { padding:12px 16px; font-size:11px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
                 color:var(--gray); border:none; background:none; cursor:pointer; white-space:nowrap;
                 border-bottom:2px solid transparent; }
  .nav-btn-tab.active, .nav-btn-tab:hover { color:var(--black); border-bottom-color:var(--black); }

  /* ── Hero ── */
  .hero { position:relative; height:380px; overflow:hidden; }
  .hero img { width:100%; height:100%; object-fit:cover; filter:grayscale(50%) brightness(.8); }
  .hero-placeholder { width:100%; height:100%; background:linear-gradient(135deg,#d1d5db,#9ca3af); }
  .hero-overlay { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:flex-end; padding:32px; }
  .hero-title { font-size:clamp(2rem,6vw,4rem); font-weight:900; color:#fff; line-height:1; margin-bottom:8px; }
  .hero-dates { font-size:13px; color:rgba(255,255,255,.8); letter-spacing:.15em; text-transform:uppercase; }
  .hero-stats { display:flex; gap:24px; margin-top:12px; }
  .stat-pill { background:rgba(255,255,255,.15); color:#fff; font-size:11px; padding:4px 12px; border-radius:99px;
               backdrop-filter:blur(4px); letter-spacing:.05em; }

  /* ── Sections ── */
  .section { max-width:800px; margin:0 auto; padding:32px 20px; }
  .section-title { font-size:11px; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
                   color:var(--gray); margin-bottom:20px; padding-bottom:10px; border-bottom:1px solid var(--border); }

  /* ── Days ── */
  .day-section { margin-bottom:48px; }
  .day-cover { height:180px; overflow:hidden; }
  .day-cover-img { width:100%; height:100%; object-fit:cover; filter:grayscale(40%) brightness(.9); }
  .day-cover-placeholder { background:var(--light); }
  .day-header { padding:20px; background:var(--black); color:#fff; }
  .day-title { font-size:2.5rem; font-weight:900; line-height:1; }
  .day-meta { display:flex; gap:16px; font-size:12px; opacity:.7; margin-top:6px; }
  .activities-list { padding:16px; background:#fafafa; }
  .activity { background:#fff; border:1px solid var(--border); border-radius:8px; padding:14px 16px; margin-bottom:10px; }
  .act-header { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:6px; }
  .act-type { font-size:10px; font-weight:700; padding:2px 8px; border-radius:99px; }
  .act-time { font-size:12px; font-weight:700; font-family:monospace; min-width:42px; color:var(--gray); }
  .act-title { font-size:14px; font-weight:600; flex:1; }
  .act-visited { font-size:10px; padding:2px 8px; border-radius:99px; }
  .act-visited.visited { background:#dcfce7; color:#16a34a; }
  .act-visited:not(.visited) { background:#f3f4f6; color:var(--gray); }
  .act-address, .act-note, .act-comment { font-size:12px; color:var(--gray); margin-top:4px; }
  .stars { color:#f59e0b; font-size:14px; margin-top:4px; }
  .act-actions { display:flex; gap:8px; margin-top:8px; }
  .map-btn, .nav-btn { font-size:11px; font-weight:600; text-decoration:none; padding:4px 12px;
                        border:1px solid var(--border); border-radius:6px; }
  .map-btn:hover, .nav-btn:hover { background:var(--light); }
  .act-photos { display:flex; gap:8px; margin-top:10px; overflow-x:auto; }
  .act-photo-img { width:100px; height:80px; object-fit:cover; border-radius:6px; flex-shrink:0; }
  .empty-day { color:var(--gray); font-size:13px; text-align:center; padding:24px; }

  /* ── Bookings ── */
  .booking-card { border:1px solid var(--border); border-radius:8px; padding:14px 16px; margin-bottom:10px; }
  .booking-header { display:flex; align-items:center; gap:10px; margin-bottom:6px; }
  .booking-type { font-size:10px; font-weight:700; background:var(--light); padding:2px 8px; border-radius:4px; }
  .booking-title { font-size:14px; font-weight:600; flex:1; }
  .booking-date { font-size:11px; color:var(--gray); }
  .booking-detail, .booking-note { font-size:12px; color:var(--gray); margin-top:3px; }
  .booking-price { font-size:12px; font-weight:600; margin-top:4px; }
  .booking-file { margin-top:10px; }
  .booking-file-img { max-width:100%; max-height:400px; border-radius:6px; }

  /* ── Members ── */
  .members-grid { display:flex; flex-wrap:wrap; gap:16px; }
  .member-card { display:flex; flex-direction:column; align-items:center; gap:8px; }
  .member-avatar { width:64px; height:64px; border-radius:50%; object-fit:cover; border:2px solid var(--border); }
  .member-name { font-size:12px; font-weight:600; }
  .empty-section { color:var(--gray); font-size:13px; padding:16px 0; }

  /* ── Print ── */
  @media print {
    .nav { display:none; }
    .day-section, .booking-card { page-break-inside:avoid; }
  }
  @media (max-width:600px) {
    .hero { height:260px; }
    .day-title { font-size:2rem; }
  }
</style>
</head>
<body>

<!-- Sticky nav tabs -->
<div class="nav" id="main-nav">
  <button class="nav-btn-tab active" onclick="showTab('itinerary')">行程</button>
  <button class="nav-btn-tab" onclick="showTab('bookings')">預訂</button>
  <button class="nav-btn-tab" onclick="showTab('members')">成員</button>
</div>

<!-- Hero -->
<div class="hero">
  ${trip.coverImage ? img(trip.coverImage, '', trip.title) : '<div class="hero-placeholder"></div>'}
  <div class="hero-overlay">
    <div class="hero-title">${trip.title}</div>
    <div class="hero-dates">${trip.startDate} — ${trip.endDate}</div>
    <div class="hero-stats">
      <span class="stat-pill">📅 ${trip.dailyItinerary.length} 天</span>
      <span class="stat-pill">📍 ${totalActs} 個活動</span>
      <span class="stat-pill">✓ ${visitedActs} 個已去</span>
      ${trip.destLabel ? `<span class="stat-pill">🗺️ ${trip.destLabel}</span>` : ''}
    </div>
  </div>
</div>

<!-- Itinerary Tab -->
<div id="tab-itinerary" class="tab-content">
  <div class="section">
    <div class="section-title">每日行程</div>
  </div>
  ${daySections}
</div>

<!-- Bookings Tab -->
<div id="tab-bookings" class="tab-content" style="display:none">
  <div class="section">
    <div class="section-title">預訂憑證</div>
    ${bookings}
  </div>
</div>

<!-- Members Tab -->
<div id="tab-members" class="tab-content" style="display:none">
  <div class="section">
    <div class="section-title">旅伴成員</div>
    <div class="members-grid">${members}</div>
  </div>
</div>

<script>
function showTab(name) {
  ['itinerary','bookings','members'].forEach(t => {
    document.getElementById('tab-'+t).style.display = t===name ? '' : 'none';
  });
  document.querySelectorAll('.nav-btn-tab').forEach((btn,i) => {
    btn.classList.toggle('active', ['itinerary','bookings','members'][i]===name);
  });
}

// Jump to day from URL hash
window.addEventListener('load', () => {
  const h = location.hash;
  if (h && h.startsWith('#day-')) {
    const el = document.getElementById(h.slice(1));
    if (el) el.scrollIntoView({ behavior:'smooth' });
  }
});
</script>
</body>
</html>`;

  return html;
}

// ── React Component ────────────────────────────────────────────────────────
export default function OfflinePage() {
  const { trips, activeTripId } = useTripStore();
  const [selectedTripId, setSelectedTripId] = useState(activeTripId || trips[0]?.id || "");
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState("");
  const [imageCount, setImageCount] = useState(0);

  const trip = trips.find(t => t.id === selectedTripId);

  const handleDownload = async () => {
    if (!trip) return;
    setStatus('loading');
    setProgress("準備中…");
    try {
      const urls = collectImageUrls(trip);
      setImageCount(urls.length);
      const html = await generateOfflineHTML(trip, setProgress);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${trip.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_offline.html`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus('done');
    } catch (e: any) {
      setProgress("錯誤：" + e.message);
      setStatus('error');
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="flex-1 p-8 md:ml-64">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <WifiOff size={28} className="text-black" />
              <h1 className="text-3xl font-black tracking-tighter uppercase">離線版下載</h1>
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-widest">OFFLINE PACK</p>
          </div>

          {/* Explainer */}
          <div className="bg-gray-50  p-6 mb-8 border border-gray-100">
            <h2 className="text-sm font-bold mb-3 uppercase tracking-widest">包含內容</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: "📅", label: "完整每日行程" },
                { icon: "🖼️", label: "所有相片（內嵌）" },
                { icon: "📋", label: "預訂詳情＋憑證" },
                { icon: "👥", label: "成員資料" },
                { icon: "🗺️", label: "Google Maps 連結" },
                { icon: "🔌", label: "無需網絡即可閱覽" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{icon}</span><span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trip selector */}
          <div className="mb-6">
            <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">選擇旅程</label>
            <div className="relative">
              <select
                value={selectedTripId}
                onChange={e => { setSelectedTripId(e.target.value); setStatus('idle'); }}
                className="w-full appearance-none border border-gray-200  px-4 py-3 pr-10 text-sm font-medium focus:outline-none focus:border-black bg-white"
              >
                {trips.map(t => (
                  <option key={t.id} value={t.id}>{t.title} ({t.startDate} – {t.endDate})</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Trip summary */}
          {trip && (
            <div className="border border-gray-100  p-5 mb-6 bg-white">
              <div className="flex items-start gap-4">
                {trip.coverImage && (
                  <img src={trip.coverImage} className="w-20 h-20 object-cover  shrink-0" alt={trip.title} />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base truncate">{trip.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{trip.startDate} — {trip.endDate}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {[
                      `${trip.dailyItinerary.length} 天`,
                      `${trip.dailyItinerary.reduce((s,d) => s+(d.activities?.length||0),0)} 活動`,
                      `${trip.bookings.length} 預訂`,
                      `${trip.members.length} 成員`,
                      `${collectImageUrls(trip).length} 張圖片`,
                    ].map(t => (
                      <span key={t} className="text-[11px] bg-gray-50 border border-gray-100 px-2 py-1  text-gray-500">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={!trip || status === 'loading'}
            className={clsx(
              "w-full py-4  text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all",
              status === 'loading'
                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                : "bg-black text-white hover:bg-gray-900 active:scale-[.98]"
            )}
          >
            {status === 'loading' ? (
              <>
                <Package size={18} className="animate-bounce" />
                打包中…
              </>
            ) : (
              <>
                <Download size={18} />
                一鍵下載離線版 (.html)
              </>
            )}
          </button>

          {/* Progress / result */}
          {status === 'loading' && (
            <div className="mt-4 p-4 bg-blue-50 ">
              <div className="text-xs text-blue-600 font-medium">{progress}</div>
              {imageCount > 0 && (
                <div className="mt-2 text-[11px] text-blue-400">
                  正在內嵌 {imageCount} 張圖片，請稍候…
                </div>
              )}
            </div>
          )}
          {status === 'done' && (
            <div className="mt-4 p-4 bg-green-50  flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600 shrink-0" />
              <div>
                <div className="text-xs font-bold text-green-700">下載完成！</div>
                <div className="text-[11px] text-green-600 mt-1">
                  儲存到手機後，出行時無需網絡即可查閱完整旅程資料。
                </div>
              </div>
            </div>
          )}
          {status === 'error' && (
            <div className="mt-4 p-4 bg-red-50  flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500 shrink-0" />
              <div className="text-xs text-red-600">{progress}</div>
            </div>
          )}

          {/* Usage tip */}
          <div className="mt-8 p-4 border border-dashed border-gray-200 ">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-2 text-gray-500">使用方法</h3>
            <ol className="space-y-1">
              {[
                "點擊「一鍵下載」，等待所有圖片打包完成",
                "將 .html 檔儲存到手機（iCloud/Google Drive/AirDrop）",
                "出發前確認可以正常打開",
                "去到目的地，直接用瀏覽器開啟 .html 即可！無需 WiFi",
              ].map((t, i) => (
                <li key={i} className="text-xs text-gray-500 flex gap-2">
                  <span className="font-bold text-gray-400 w-4 shrink-0">{i+1}.</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </div>

        </div>
      </main>
    </div>
  );
}
