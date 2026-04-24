"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import Cookies from "js-cookie";

interface CityState {
  citySlug: string;
  cityName: string;
  setCity: (slug: string, name: string) => void;
}

export const useCity = create<CityState>()(
  persist(
    (set) => ({
      citySlug: "mumbai",
      cityName: "Mumbai",
      setCity: (citySlug, cityName) => {
        Cookies.set("selectedCity", citySlug, { expires: 365 });
        set({ citySlug, cityName });
      },
    }),
    { name: "sb_city" }
  )
);
