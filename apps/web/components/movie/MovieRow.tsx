"use client";
import { MovieCard } from "./MovieCard";
import type { MovieDto } from "@showbook/types";

export function MovieRow({
  title,
  movies,
  citySlug,
  seeAllHref,
}: {
  title: string;
  movies: MovieDto[];
  citySlug: string;
  seeAllHref?: string;
}) {
  if (movies.length === 0) return null;
  return (
    <section className="py-6">
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
        {seeAllHref && (
          <a href={seeAllHref} className="text-sm text-brand hover:underline">
            See all
          </a>
        )}
      </div>
      <div className="scroll-row flex gap-4 pb-2">
        {movies.map((m) => (
          <MovieCard key={m.id} movie={m} citySlug={citySlug} />
        ))}
      </div>
    </section>
  );
}
