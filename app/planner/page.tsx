"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTripStore } from "@/store/useTripStore";

export default function PlannerRedirect() {
  const router = useRouter();
  const { trips, activeTripId, isSyncing } = useTripStore();

  useEffect(() => {
    if (isSyncing) return; // 等待同步完成

    if (activeTripId) {
      router.push(`/planner/${activeTripId}`);
    } else if (trips.length > 0) {
      router.push(`/planner/${trips[0].id}`);
    } else {
      // 如果真的沒有旅程，留在這或者去首頁
      // router.push("/"); 
    }
  }, [trips, activeTripId, isSyncing, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-gray-400 text-xs tracking-widest uppercase animate-pulse">
      Loading Planner...
    </div>
  );
}