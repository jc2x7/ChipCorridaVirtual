import { create } from 'zustand';
import { TrackingEntry } from '@/types';

interface TrackingState {
  activeRaceId: string | null;
  trackingId: string | null;
  tracking: TrackingEntry | null;
  isTracking: boolean;
  setActiveRace: (raceId: string | null, trackingId: string | null) => void;
  setTracking: (tracking: TrackingEntry | null) => void;
  setIsTracking: (isTracking: boolean) => void;
  reset: () => void;
}

export const useTrackingStore = create<TrackingState>((set) => ({
  activeRaceId: null,
  trackingId: null,
  tracking: null,
  isTracking: false,

  setActiveRace: (raceId, trackingId) =>
    set({ activeRaceId: raceId, trackingId }),
  setTracking: (tracking) => set({ tracking }),
  setIsTracking: (isTracking) => set({ isTracking }),
  reset: () =>
    set({
      activeRaceId: null,
      trackingId: null,
      tracking: null,
      isTracking: false,
    }),
}));
