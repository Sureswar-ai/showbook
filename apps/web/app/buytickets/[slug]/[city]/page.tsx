"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { ShowtimesByTheaterDto, ShowDto } from "@showbook/types";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Skeleton, Badge } from "@/components/ui/primitives";
import { addDays, format, startOfDay } from "date-fns";
import { MapPin, Info } from "lucide-react";
import { paiseToRupees } from "@/lib/utils/format";

export default function ShowtimesPage() {
  const { slug, city } = useParams<{ slug: string; city: string }>();
  const searchParams = useSearchParams();
  const movieId = searchParams.get("movieId");
  const router = useRouter();

  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i));
  const selectedDate = dates[selectedDateIdx]!;

  const { data: showtimes, isLoading } = useQuery({
    queryKey: ["showtimes", movieId, selectedDate.toISOString()],
    queryFn: () =>
      api.get<ShowtimesByTheaterDto[]>(
        `/movies/${movieId}/showtimes?date=${format(selectedDate, "yyyy-MM-dd")}`
      ),
    enabled: !!movieId,
  });

  if (!movieId) return <div className="p-6">Missing movie.</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 text-sm text-gray-500">
        <button onClick={() => router.back()} className="hover:underline">← Back</button>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold mb-4 capitalize">{slug.replace(/-/g, " ")}</h1>

      {/* Date strip */}
      <div className="scroll-row flex gap-2 pb-3 mb-4 border-b border-gray-200">
        {dates.map((d, i) => {
          const active = i === selectedDateIdx;
          return (
            <button
              key={i}
              onClick={() => setSelectedDateIdx(i)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg border transition-colors text-center min-w-[72px] ${
                active
                  ? "bg-brand text-white border-brand"
                  : "bg-white border-gray-300 hover:border-gray-400"
              }`}
            >
              <div className="text-xs uppercase">{format(d, "EEE")}</div>
              <div className="text-lg font-bold">{format(d, "d")}</div>
              <div className="text-xs">{format(d, "MMM")}</div>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : !showtimes || showtimes.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          No showtimes for this date. Try another day.
        </div>
      ) : (
        <div className="space-y-4">
          {showtimes.map((group) => (
            <TheaterRow
              key={group.theater.id}
              group={group}
              onPick={(show) => router.push(`/seat-layout/${show.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TheaterRow({
  group,
  onPick,
}: {
  group: ShowtimesByTheaterDto;
  onPick: (s: ShowDto) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 bg-white">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <h3 className="font-semibold">{group.theater.name}</h3>
          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
            <MapPin className="h-3 w-3" />
            {group.theater.address}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {group.theater.amenities.slice(0, 4).map((a) => (
              <Badge key={a} variant="outline" className="text-[10px]">
                {a.replaceAll("_", " ")}
              </Badge>
            ))}
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <Info className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {group.shows.map((s) => {
          const soldOut = s.availableSeatCount === 0;
          const fast = s.availableSeatCount < s.totalSeatCount * 0.2 && !soldOut;
          return (
            <button
              key={s.id}
              disabled={soldOut}
              onClick={() => onPick(s)}
              className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                soldOut
                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through"
                  : fast
                  ? "border-orange-400 hover:bg-orange-50"
                  : "border-green-500 text-green-700 hover:bg-green-50"
              }`}
              title={`${paiseToRupees(s.minPricePaise)} · ${s.format} ${s.language}`}
            >
              <div className="font-semibold">
                {format(new Date(s.startTime), "h:mm a")}
              </div>
              <div className="text-[10px] uppercase">
                {s.format} · {s.language}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
