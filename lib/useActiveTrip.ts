'use client';
import { useEffect, useState } from 'react';
import { useTripStore } from '@/store/useTripStore';
import { Trip } from '@/store/useTripStore';

/**
 * Safe hook for subpages that need the active trip.
 * Handles Zustand hydration timing - never hangs forever.
 * Returns { trip, isLoading } instead of potentially undefined forever.
 */
export function useActiveTrip(): { trip: Trip | null; isLoading: boolean } {
  const { trips, activeTripId, _hasHydrated } = useTripStore();
  const [isLoading, setIsLoading] = useState(true);

  const trip = activeTripId
    ? trips.find(t => t.id === activeTripId) ?? trips[0] ?? null
    : trips[0] ?? null;

  useEffect(() => {
    if (!_hasHydrated) return;
    // Give cloud sync a moment, then stop loading regardless
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, [_hasHydrated]);

  // Once we have a trip, stop loading immediately
  useEffect(() => {
    if (trip && _hasHydrated) setIsLoading(false);
  }, [trip, _hasHydrated]);

  return { trip, isLoading };
}
