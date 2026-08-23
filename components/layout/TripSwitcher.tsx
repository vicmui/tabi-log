"use client";
import { useTripStore } from "@/store/useTripStore";
import { ChevronDown, MapPin } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function TripSwitcher() {
  const { trips, activeTripId, setActiveTrip } = useTripStore();
  const activeTrip = trips.find(t => t.id === activeTripId) || trips[0];
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => { setIsOpen(false); }, [pathname]);

  // Close on outside click without blocking the whole page
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  if (!activeTrip) return null;

  return (
    <div ref={ref} className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase hover:opacity-70 transition-opacity"
      >
        <MapPin size={16} />
        <span className="truncate max-w-[150px]">{activeTrip.title}</span>
        <ChevronDown size={14} className={clsx("transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-100 py-2 z-50">
          <p className="px-4 py-2 text-xs text-gray-500 tracking-widest uppercase border-b border-gray-50 mb-1">切換行程</p>
          {trips.map(trip => (
            <button
              key={trip.id}
              onClick={() => { setActiveTrip(trip.id); setIsOpen(false); }}
              className={clsx(
                "w-full text-left px-4 py-2 text-xs font-medium hover:bg-gray-50 transition-colors truncate",
                activeTrip.id === trip.id ? "text-black bg-gray-50" : "text-gray-500"
              )}
            >
              {trip.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
