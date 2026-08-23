// lib/exportTripPDF.ts
import { Trip } from "@/store/useTripStore";

const A4_W_PX = 794;   // A4 @ 96dpi
const A4_H_PX = 1123;
const SCALE   = 2;

/**
 * 把封面圖轉成 data URL。
 *
 * 原因：html2canvas 遇上跨網域圖片時會污染 canvas 而整張圖畫唔出，
 * 封面就會變成一大格黑色。先用 fetch 取回並轉成 base64，
 * html2canvas 便當作同源圖片處理。取不到就回傳 null，改用純文字封面。
 */
async function toDataUrl(url?: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors", cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** 等版面穩定：字型載入完成 + 兩幀繪製 */
async function waitForPaint() {
  try { await (document as any).fonts?.ready; } catch { /* 忽略 */ }
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
}

export async function exportTripPDF(trip: Trip): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const { createRoot } = await import("react-dom/client");
  const React = await import("react");
  const { default: TripPDFTemplate } = await import("@/components/planner/TripPDFTemplate");

  // 先把封面圖轉成 data URL，令 html2canvas 畫得到
  const coverDataUrl = await toDataUrl(trip.coverImage);

  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed; top: 0; left: -10000px;
    width: ${A4_W_PX}px; background: #fff;
    z-index: -1; overflow: visible;
  `;
  document.body.appendChild(container);

  const root = createRoot(container);
  try {
    await new Promise<void>(resolve => {
      root.render(React.createElement(TripPDFTemplate, { trip, coverDataUrl }));
      setTimeout(resolve, 0);
    });
    await waitForPaint();

    // 每一頁各自截圖 —— 舊版是把整份文件畫成一張長圖再按 A4 高度切開，
    // 只要有一頁高度稍有偏差，之後每一頁都會由中間切斷文字。
    const pages = Array.from(
      container.querySelectorAll<HTMLElement>("[data-pdf-page]")
    );
    if (pages.length === 0) throw new Error("找不到可匯出的頁面");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [A4_W_PX, A4_H_PX],
      hotfixes: ["px_scaling"],
    });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], {
        scale: SCALE,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        width: A4_W_PX,
        height: A4_H_PX,
        windowWidth: A4_W_PX,
        windowHeight: A4_H_PX,
      });

      if (i > 0) pdf.addPage([A4_W_PX, A4_H_PX], "portrait");
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.94),
        "JPEG",
        0, 0, pdfW, pdfH,
        undefined,
        "FAST"
      );
    }

    const safeTitle = trip.title.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_");
    pdf.save(`${safeTitle}_行程.pdf`);
  } finally {
    root.unmount();
    container.remove();
  }
}
