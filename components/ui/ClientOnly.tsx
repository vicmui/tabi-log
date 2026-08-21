'use client';
import { useEffect, useState } from 'react';

export default function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <p className="text-xs tracking-[0.3em] text-gray-400 uppercase animate-pulse">載入中...</p>
    </div>
  );
  return <>{children}</>;
}
