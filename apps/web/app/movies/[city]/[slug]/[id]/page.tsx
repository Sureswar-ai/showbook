"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { MovieDetailDto, ReviewDto } from "@showbook/types";
import { useParams, useRouter } from "next/navigation";
import { Button, Badge, Skeleton } from "@/components/ui/primitives";
import { Star, Clock, Calendar } from "lucide-react";
import { shortDate } from "@/lib/utils/format";

export default function MovieDetailPage() {
  const { city, id } = useParams<{ city: string; id: string }>();
  const router = useRouter();

  const { data: movie, isLoading } = useQuery({
    queryKey: ["movie", id],
    queryFn: () => api.get<MovieDetailDto>(`/movies/${id}`),
  });
  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", "movie", id],
    queryFn: () => api.get<ReviewDto[]>(`/reviews?movieId=${id}`),
  });

  if (isLoading || !movie) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div>
      <div
        className="relative h-64 md:h-96 bg-cover bg-center flex items-end"
        style={{ backgroundImage: `url(${movie.backdropUrl})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40" />
        <div className="relative mx-auto max-w-7xl px-4 pb-8 flex gap-6 text-white w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="hidden md:block h-64 w-44 rounded-lg shadow-xl"
          />
          <div className="flex-1">
            <h1 className="text-3xl md:text-5xl font-black">{movie.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {movie.userRating && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {Number(movie.userRating).toFixed(1)}/5
                  <span className="text-sm opacity-70">· {movie.reviewCount} reviews</span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {movie.formats.map((f) => (
                <Badge key={f} variant="outline" className="bg-white/10 border-white/30 text-white">
                  {f}
                </Badge>
              ))}
              {movie.languages.map((l) => (
                <Badge key={l} variant="outline" className="bg-white/10 border-white/30 text-white">
                  {l}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 text-sm opacity-90">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {Math.floor(movie.runtimeMinutes / 60)}h {movie.runtimeMinutes % 60}m
              </span>
              <span>•</span>
              <span>{movie.certificate}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> {shortDate(movie.releaseDate)}
              </span>
            </div>
            <Button
              size="lg"
              className="mt-5"
              onClick={() => router.push(`/buytickets/${movie.slug}/${city}?movieId=${movie.id}`)}
            >
              Book tickets
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        <section>
          <h2 className="text-xl font-bold mb-2">About the movie</h2>
          <p className="text-gray-700 leading-relaxed">{movie.synopsis}</p>
          <div className="mt-3 text-sm text-gray-600">
            Genres: {movie.genres.join(", ")}
          </div>
        </section>

        {movie.castCrew.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4">Cast & Crew</h2>
            <div className="scroll-row flex gap-4">
              {movie.castCrew.map((c) => (
                <div key={c.id} className="flex-shrink-0 w-24 text-center">
                  {c.personImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.personImageUrl}
                      alt={c.personName}
                      className="h-20 w-20 rounded-full object-cover mx-auto border-2 border-white shadow"
                    />
                  )}
                  <div className="text-xs font-medium mt-1 line-clamp-1">{c.personName}</div>
                  <div className="text-xs text-gray-500">
                    {c.role === "DIRECTOR" ? "Director" : c.characterName || "Actor"}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xl font-bold mb-4">Reviews</h2>
          {reviews.length === 0 ? (
            <div className="text-gray-500">No reviews yet.</div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium">{r.userName}</div>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      {r.rating.toFixed(1)}
                    </div>
                  </div>
                  {r.text && <p className="text-sm text-gray-700">{r.text}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
