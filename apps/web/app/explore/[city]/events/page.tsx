"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, Skeleton } from "@/components/ui/primitives";
import Link from "next/link";
import { format } from "date-fns";
import { useParams } from "next/navigation";

interface EventDto {
  id: string;
  title: string;
  slug: string;
  eventType: string;
  description: string;
  bannerUrl: string;
  occurrences: { id: string; startTime: string; venueName: string; seatingType: string }[];
}

export default function EventsPage({ searchParams }: { searchParams?: { type?: string } }) {
  const { city } = useParams<{ city: string }>();
  const type = searchParams?.type;
  const { data: events, isLoading } = useQuery({
    queryKey: ["events", city, type],
    queryFn: () => api.get<EventDto[]>(`/events${type ? `?type=${type}` : ""}`),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 capitalize">
        {type?.toLowerCase() ?? "Events"}
      </h1>
      {isLoading ? (
        <div className="grid md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-60" />
          ))}
        </div>
      ) : !events || events.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No events found.</div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {events.map((e) => (
            <Link key={e.id} href={`/events/${city}/${e.slug}/${e.id}`}>
              <Card className="overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.bannerUrl} alt={e.title} className="w-full aspect-[16/9] object-cover" />
                <div className="p-3">
                  <div className="text-xs uppercase tracking-wide text-brand">{e.eventType}</div>
                  <div className="font-semibold">{e.title}</div>
                  {e.occurrences[0] && (
                    <div className="text-xs text-gray-500 mt-1">
                      Next: {format(new Date(e.occurrences[0].startTime), "EEE d MMM · h:mm a")} @ {e.occurrences[0].venueName}
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
