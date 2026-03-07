"use client";
import ClientOnly from "@/components/ui/ClientOnly";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTripStore } from "@/store/useTripStore";

export default function PlannerRedirect() {
  const router = useRouter();
  const { trips, activeTripId, _hasHydrated } = useTripStore();

  useEffect(() => {
    if (!_hasHydrated) return; // Wait for localStorage to be read first

    if (activeTripId) {
      router.push(`/planner/${activeTripId}`);
    } else if (trips.length > 0) {
      router.push(`/planner/${trips[0].id}`);
    }
  }, [_hasHydrated, trips, activeTripId, router]);

  return (
    <ClientOnly>
    <div className="flex min-h-screen items-center justify-center bg-white text-gray-400 text-xs tracking-widest uppercase animate-pulse">
      載入中...
    </div>
    </ClientOnly>
  );
}
