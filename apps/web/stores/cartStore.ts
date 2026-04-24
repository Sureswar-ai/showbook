"use client";
import { create } from "zustand";

interface CartState {
  showId: string | null;
  selectedSeatIds: string[];
  bookingIntentId: string | null;
  lockExpiresAt: string | null;
  selectSeats: (ids: string[]) => void;
  setIntent: (intentId: string, expiresAt: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>((set) => ({
  showId: null,
  selectedSeatIds: [],
  bookingIntentId: null,
  lockExpiresAt: null,
  selectSeats: (ids) => set({ selectedSeatIds: ids }),
  setIntent: (intentId, expiresAt) => set({ bookingIntentId: intentId, lockExpiresAt: expiresAt }),
  clear: () =>
    set({ showId: null, selectedSeatIds: [], bookingIntentId: null, lockExpiresAt: null }),
}));
