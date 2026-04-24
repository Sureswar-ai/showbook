import Link from "next/link";
import type { MovieDto } from "@showbook/types";
import { Star } from "lucide-react";

export function MovieCard({ movie, citySlug }: { movie: MovieDto; citySlug: string }) {
  return (
    <Link
      href={`/movies/${citySlug}/${movie.slug}/${movie.id}`}
      className="group flex-shrink-0 w-[160px] md:w-[200px]"
    >
      <div className="aspect-[2/3] overflow-hidden rounded-lg bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={movie.posterUrl}
          alt={movie.title}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      </div>
      <div className="mt-2">
        {movie.userRating && (
          <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            <span className="font-semibold">{Number(movie.userRating).toFixed(1)}/5</span>
            <span className="text-gray-400">· {movie.genres.slice(0, 2).join(", ")}</span>
          </div>
        )}
        <h3 className="font-medium text-sm line-clamp-1">{movie.title}</h3>
        <p className="text-xs text-gray-500 line-clamp-1">
          {movie.languages.slice(0, 2).join(", ")} · {movie.certificate}
        </p>
      </div>
    </Link>
  );
}
