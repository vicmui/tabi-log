// lib/exportTripPDF.ts
import { Trip } from "@/store/useTripStore";

const A4_W_PX = 794;
const A4_H_PX = 1123;

export async function exportTripPDF(trip: Trip): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const { createRoot } = await import("react-dom/client");
  const React = await import("react");
  const { default: TripPDFTemplate } = await import("@/components/planner/TripPDFTemplate");

  // Mount hidden container
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed; top: 0; left: -9999px;
    width: ${A4_W_PX}px; background: #fff;
    z-index: -1; overflow: visible;
  `;
  document.body.appendChild(container);

  await new Promise<void>(resolve => {
    const root = createRoot(container);
    root.render(React.createElement(TripPDFTemplate, { trip }));
    // Wait for React + images to paint
    setTimeout(resolve, 800);
  });

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
    logging: false,
    width: A4_W_PX,
    windowWidth: A4_W_PX,
  });

  const imgW      = canvas.width;
  const imgH      = canvas.height;
  const scale     = 2;
  const pageH     = A4_H_PX * scale;
  const totalPages = Math.ceil(imgH / pageH);

  const pdf  = new jsPDF({ orientation: "portrait", unit: "px", format: "a4", hotfixes: ["px_scaling"] });
  const pdfW = pdf.internal.pageSize.getWidth();

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage();

    const srcY      = page * pageH;
    const srcHeight = Math.min(pageH, imgH - srcY);

    const pageCanvas    = document.createElement("canvas");
    pageCanvas.width    = imgW;
    pageCanvas.height   = srcHeight;
    const ctx = pageCanvas.getContext("2d")!;
    ctx.drawImage(canvas, 0, srcY, imgW, srcHeight, 0, 0, imgW, srcHeight);

    const imgData = pageCanvas.toDataURL("image/jpeg", 0.93);
    const renderH = (srcHeight / scale / A4_W_PX) * pdfW;
    pdf.addImage(imgData, "JPEG", 0, 0, pdfW, renderH);
  }

  pdf.save(`${trip.title.replace(/\s+/g, "_")}_行程.pdf`);
  document.body.removeChild(container);
}
