"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { CityDto } from "@showbook/types";
import { useCity } from "@/stores/cityStore";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/primitives";
import { MapPin } from "lucide-react";

export function CitySelector() {
  const { citySlug, cityName, setCity } = useCity();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data: cities = [] } = useQuery({
    queryKey: ["cities", "top"],
    queryFn: () => api.get<CityDto[]>("/cities?top=true"),
  });

  function pick(c: CityDto) {
    setCity(c.slug, c.name);
    setOpen(false);
    router.push(`/explore/${c.slug}`);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm hover:bg-gray-100"
      >
        <MapPin className="h-4 w-4" />
        <span className="font-medium">{cityName}</span>
        <span className="text-gray-400 text-xs">▼</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} className="max-w-lg">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Select your city</h2>
          <div className="grid grid-cols-2 gap-2">
            {cities.map((c) => (
              <button
                key={c.id}
                onClick={() => pick(c)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  c.slug === citySlug
                    ? "border-brand bg-brand-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-gray-500">{c.state}</div>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
