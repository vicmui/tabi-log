"use client";
import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useTripStore } from "@/store/useTripStore";
import { buildRecap } from "@/lib/recap";
import RecapView from "@/components/recap/RecapView";

/**
 * 旅程回顧。
 *
 * 這一頁不需要使用者再輸入任何東西 —— 打卡、評分、相片、開支，
 * 旅途中早已逐點記下，這裡只是把它們重新排成「去過甚麼」的樣子。
 */
export default function RecapPage() {
  const params = useParams();
  const { trips, _hasHydrated, setActiveTrip } = useTripStore();
  const trip = trips.find(t => t.id === params.id);

  // 讓底部導覽的「預算」「行程」等分頁都指向這個旅程
  useEffect(() => { if (trip) setActiveTrip(trip.id); }, [trip?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const recap = useMemo(() => (trip ? buildRecap(trip) : null), [trip]);

  if (!_hasHydrated) {
    return <div className="p-10 text-center animate-pulse text-gray-500 text-xs tracking-widest">載入中...</div>;
  }
  if (!trip || !recap) {
    return <div className="p-10 text-center text-gray-500 text-xs tracking-widest">找不到旅程</div>;
  }

  return <RecapView trip={trip} recap={recap} />;
}
