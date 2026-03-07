'use client';
import { useEffect, useState } from 'react';

export default function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <p className="text-[10px] tracking-[0.3em] text-gray-300 uppercase animate-pulse">載入中...</p>
    </div>
  );
  return <>{children}</>;
}
