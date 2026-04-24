"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { MovieDto, Paginated } from "@showbook/types";
import { MovieRow } from "@/components/movie/MovieRow";
import { Skeleton } from "@/components/ui/primitives";
import { useEffect } from "react";
import { useCity } from "@/stores/cityStore";

export default function CityHomePage({ params }: { params: { city: string } }) {
  const { city } = params;
  const { setCity } = useCity();

  useEffect(() => {
    // Sync city store with URL
    setCity(city, city.charAt(0).toUpperCase() + city.slice(1));
  }, [city, setCity]);

  const { data: nowShowing, isLoading: loading1 } = useQuery({
    queryKey: ["movies", city, "NOW_SHOWING"],
    queryFn: () => api.get<Paginated<MovieDto>>(`/movies?status=NOW_SHOWING&pageSize=20`),
  });
  const { data: upcoming } = useQuery({
    queryKey: ["movies", city, "UPCOMING"],
    queryFn: () => api.get<Paginated<MovieDto>>(`/movies?status=UPCOMING&pageSize=10`),
  });

  const byGenre = (genre: string): MovieDto[] =>
    nowShowing?.items.filter((m) => m.genres.includes(genre)) ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4">
      <Hero />
      {loading1 ? (
        <div className="flex gap-4 pt-6 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[300px] w-[200px] flex-shrink-0" />
          ))}
        </div>
      ) : (
        <>
          <MovieRow
            title="Recommended Movies"
            movies={nowShowing?.items.slice(0, 10) ?? []}
            citySlug={city}
            seeAllHref={`/explore/${city}/movies`}
          />
          {byGenre("Drama").length > 0 && (
            <MovieRow title="Premieres" movies={byGenre("Drama").slice(0, 6)} citySlug={city} />
          )}
          {upcoming && upcoming.items.length > 0 && (
            <MovieRow title="Coming Soon" movies={upcoming.items} citySlug={city} />
          )}
          {byGenre("Thriller").length > 0 && (
            <MovieRow title="Thrillers" movies={byGenre("Thriller").slice(0, 8)} citySlug={city} />
          )}
          {byGenre("Comedy").length > 0 && (
            <MovieRow title="Comedy" movies={byGenre("Comedy").slice(0, 8)} citySlug={city} />
          )}
          {byGenre("Animation").length > 0 && (
            <MovieRow title="Family & Animation" movies={byGenre("Animation").slice(0, 8)} citySlug={city} />
          )}
        </>
      )}
    </div>
  );
}

function Hero() {
  return (
    <div className="pt-6 pb-2">
      <div className="rounded-2xl overflow-hidden h-48 md:h-64 bg-gradient-to-br from-brand via-orange-500 to-amber-400 flex items-center justify-center text-white">
        <div className="text-center px-6">
          <h1 className="text-3xl md:text-5xl font-black mb-2">Every story has a seat</h1>
          <p className="text-sm md:text-base opacity-90">
            Movies, events, plays, sports — all in one place.
          </p>
        </div>
      </div>
    </div>
  );
}
