"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { MovieDto, Paginated } from "@showbook/types";
import { MovieCard } from "@/components/movie/MovieCard";
import { Skeleton, Button, Badge } from "@/components/ui/primitives";
import { useState } from "react";

const GENRES = ["Action", "Drama", "Comedy", "Horror", "Romance", "Thriller", "Sci-Fi", "Animation", "Mystery", "Adventure"];
const LANGS = ["Hindi", "English", "Tamil", "Telugu", "Marathi", "Punjabi", "Gujarati"];
const FORMATS = ["2D", "3D", "IMAX", "4DX", "Dolby Atmos"];

export default function MoviesListPage({ params }: { params: { city: string } }) {
  const [selectedGenres, setGenres] = useState<string[]>([]);
  const [selectedLangs, setLangs] = useState<string[]>([]);
  const [selectedFormats, setFormats] = useState<string[]>([]);
  const [sort, setSort] = useState("popularity");

  const { data, isLoading } = useQuery({
    queryKey: ["movies", "list", { genres: selectedGenres, langs: selectedLangs, formats: selectedFormats, sort }],
    queryFn: () => {
      const qs = new URLSearchParams({ status: "NOW_SHOWING", pageSize: "40", sort });
      if (selectedGenres[0]) qs.set("genre", selectedGenres[0]);
      if (selectedLangs[0]) qs.set("language", selectedLangs[0]);
      if (selectedFormats[0]) qs.set("format", selectedFormats[0]);
      return api.get<Paginated<MovieDto>>(`/movies?${qs}`);
    },
  });

  function toggle(list: string[], set: (v: string[]) => void, v: string) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-4">Movies in {params.city}</h1>
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        <aside className="space-y-4">
          <FilterGroup title="Languages">
            {LANGS.map((l) => (
              <FilterChip key={l} active={selectedLangs.includes(l)} onClick={() => toggle(selectedLangs, setLangs, l)}>
                {l}
              </FilterChip>
            ))}
          </FilterGroup>
          <FilterGroup title="Genres">
            {GENRES.map((g) => (
              <FilterChip key={g} active={selectedGenres.includes(g)} onClick={() => toggle(selectedGenres, setGenres, g)}>
                {g}
              </FilterChip>
            ))}
          </FilterGroup>
          <FilterGroup title="Formats">
            {FORMATS.map((f) => (
              <FilterChip key={f} active={selectedFormats.includes(f)} onClick={() => toggle(selectedFormats, setFormats, f)}>
                {f}
              </FilterChip>
            ))}
          </FilterGroup>
        </aside>
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-600">{data?.total ?? 0} movies</div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="popularity">Popularity</option>
              <option value="release">Release date</option>
              <option value="rating">Rating</option>
              <option value="az">A–Z</option>
            </select>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-[300px] w-full" />
              ))}
            </div>
          ) : data && data.items.length === 0 ? (
            <div className="text-center py-16 text-gray-500">No movies match your filters.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data?.items.map((m) => (
                <MovieCard key={m.id} movie={m} citySlug={params.city} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">{title}</div>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs rounded-full px-3 py-1 border transition-colors ${
        active ? "bg-brand text-white border-brand" : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
      }`}
    >
      {children}
    </button>
  );
}
