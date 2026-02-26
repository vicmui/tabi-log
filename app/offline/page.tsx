export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-8">
      <div className="mb-8">
        <div className="text-6xl mb-4">✈️</div>
        <h1 className="text-2xl font-black tracking-tighter uppercase mb-2">離線模式</h1>
        <div className="h-[2px] w-10 bg-black mx-auto my-4" />
        <p className="text-sm text-gray-400 tracking-widest">你正在飛行中</p>
      </div>
      <p className="text-xs text-gray-400 max-w-xs leading-relaxed mb-8">
        目前無法連線。<br/>
        已緩存的行程資料仍可正常使用 —<br/>
        請嘗試返回主頁。
      </p>
      <a
        href="/"
        className="text-[10px] font-bold tracking-widest uppercase border border-black px-8 py-3 hover:bg-black hover:text-white transition-colors"
      >
        返回主頁
      </a>
    </div>
  );
}
