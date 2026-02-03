"use client";
import { useState } from "react";
import html2canvas from "html2canvas";
import { Share2, Download, Loader2 } from "lucide-react";

export default function ShareItinerary({ elementId, tripTitle, day }: { elementId: string, tripTitle: string, day: string }) {
  const [loading, setLoading] = useState(false);

  const handleCapture = async () => {
    setLoading(true);
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2, // 提高解析度
        useCORS: true, // 嘗試讀取跨域圖片
        backgroundColor: "#ffffff",
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `${tripTitle}-${day}.png`;
      link.click();
    } catch (err) {
      console.error("Screenshot failed", err);
      alert("截圖失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleCapture} 
      disabled={loading}
      className="flex items-center gap-2 text-[10px] tracking-widest border border-gray-200 text-gray-500 px-3 py-2 rounded-lg hover:border-black hover:text-black transition-colors bg-white uppercase"
    >
      {loading ? <Loader2 size={12} className="animate-spin"/> : <Share2 size={12} />}
      {loading ? "生成中..." : "分享行程 (IG)"}
    </button>
  );
}