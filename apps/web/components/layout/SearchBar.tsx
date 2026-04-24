"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { SearchResultDto } from "@showbook/types";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/primitives";
import { Search } from "lucide-react";

export function SearchBar() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: results = [] } = useQuery({
    queryKey: ["search-ac", q],
    queryFn: () => api.get<SearchResultDto[]>(`/search/autocomplete?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
  });

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  const grouped = results.reduce<Record<string, SearchResultDto[]>>((acc, r) => {
    (acc[r.type] ||= []).push(r);
    return acc;
  }, {});

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search for movies, events, theaters"
          className="pl-9"
        />
      </div>
      {open && q.length >= 2 && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-auto">
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type}>
              <div className="px-3 pt-2 pb-1 text-xs uppercase tracking-wide text-gray-500">
                {type}s
              </div>
              {items.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => {
                    setOpen(false);
                    setQ("");
                    router.push(r.url);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left"
                >
                  {r.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.imageUrl} alt="" className="h-10 w-8 rounded object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.title}</div>
                    {r.subtitle && (
                      <div className="text-xs text-gray-500 truncate">{r.subtitle}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
