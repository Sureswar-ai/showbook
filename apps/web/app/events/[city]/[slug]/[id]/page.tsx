"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useParams } from "next/navigation";
import { Skeleton, Badge, Card } from "@/components/ui/primitives";
import { format } from "date-fns";

interface EventDetailDto {
  id: string;
  title: string;
  eventType: string;
  description: string;
  bannerUrl: string;
  durationHours: number | null;
  ageRestriction: string | null;
  occurrences: {
    id: string;
    startTime: string;
    endTime: string | null;
    seatingType: string;
    venueName: string;
    venueAddress: string;
  }[];
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ev, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: () => api.get<EventDetailDto>(`/events/${id}`),
  });

  if (isLoading || !ev) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div>
      <div
        className="relative h-64 md:h-96 bg-cover bg-center flex items-end"
        style={{ backgroundImage: `url(${ev.bannerUrl})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 pb-8 text-white">
          <Badge className="mb-2">{ev.eventType}</Badge>
          <h1 className="text-3xl md:text-5xl font-black">{ev.title}</h1>
          <div className="text-sm opacity-80 mt-2">
            {ev.durationHours ? `${ev.durationHours} hrs` : ""}
            {ev.ageRestriction ? ` · ${ev.ageRestriction}+` : ""}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <p className="text-gray-700 leading-relaxed">{ev.description}</p>

        <section>
          <h2 className="text-xl font-semibold mb-3">Dates & Venues</h2>
          <div className="space-y-2">
            {ev.occurrences.map((o) => (
              <Card key={o.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{format(new Date(o.startTime), "EEE d MMM yyyy · h:mm a")}</div>
                  <div className="text-sm text-gray-600">{o.venueName} · {o.venueAddress}</div>
                  <Badge variant="outline" className="mt-1">{o.seatingType}</Badge>
                </div>
                <div className="text-sm text-gray-500">
                  Event ticketing coming soon
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
