"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTripStore } from "@/store/useTripStore";

export default function PlannerRedirect() {
  const router = useRouter();
  const { trips, activeTripId } = useTripStore();

  useEffect(() => {
    // 1. 如果有設定 "正在進行的旅程"，就跳轉去那一個
    if (activeTripId) {
      router.push(`/planner/${activeTripId}`);
    } 
    // 2. 如果沒有，但有列表，就跳轉去第一個
    else if (trips.length > 0) {
      router.push(`/planner/${trips[0].id}`);
    } 
    // 3. 如果完全沒有旅程，就回首頁
    else {
      router.push("/");
    }
  }, [trips, activeTripId, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-gray-400 text-xs tracking-widest uppercase animate-pulse">
      Loading Planner...
    </div>
  );
}