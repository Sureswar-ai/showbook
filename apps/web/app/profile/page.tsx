"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { BookingDto } from "@showbook/types";
import { useState } from "react";
import { Card, Button, Badge, Skeleton } from "@/components/ui/primitives";
import { paiseToRupees, showTimeLabel } from "@/lib/utils/format";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/stores/authStore";
import { useRouter } from "next/navigation";

type Tab = "upcoming" | "past" | "cancelled";

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("upcoming");
  const qc = useQueryClient();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["my-bookings", tab],
    queryFn: () => api.get<BookingDto[]>(`/bookings/me?status=${tab}`),
    enabled: !!user,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post<{ success: boolean }>(`/bookings/${id}/cancel`),
    onSuccess: () => {
      toast.success("Booking cancelled. Refund will be processed.");
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!user) {
    if (typeof window !== "undefined") router.push("/auth/login");
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">My Account</h1>
      <p className="text-gray-600 mb-6">
        {user.name ?? user.phone} · <Link href="/profile/inbox" className="text-brand hover:underline">Inbox</Link>
      </p>

      <div className="flex gap-2 border-b border-gray-200 mb-6">
        {(["upcoming", "past", "cancelled"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t ? "border-brand text-brand" : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : bookings && bookings.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          No {tab} bookings yet.
          {tab === "upcoming" && (
            <div className="mt-4">
              <Link href="/">
                <Button>Browse movies</Button>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {bookings?.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.moviePosterUrl}
                  alt=""
                  className="h-24 w-16 rounded object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{b.movieTitle}</div>
                      <div className="text-xs text-gray-500">
                        Booking #{b.bookingNumber}
                      </div>
                    </div>
                    <Badge
                      variant={
                        b.status === "CONFIRMED" ? "success" : b.status === "CANCELLED" ? "danger" : "warning"
                      }
                    >
                      {b.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {b.show.theaterName} · {showTimeLabel(b.show.startTime)}
                  </div>
                  <div className="text-sm">
                    Seats: <span className="font-medium">{b.seats.map((s) => `${s.rowLabel}${s.seatNumber}`).join(", ")}</span>
                  </div>
                  <div className="text-sm font-semibold mt-1">{paiseToRupees(b.totalPaise)}</div>
                  <div className="flex gap-2 mt-2">
                    {tab === "upcoming" && b.status === "CONFIRMED" && (
                      <>
                        <Link href={`/booking-confirmation/${b.id}`}>
                          <Button size="sm" variant="outline">View QR</Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm("Cancel this booking?")) cancelMutation.mutate(b.id);
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    {tab === "past" && b.status === "CONFIRMED" && (
                      <Link href={`/movies/mumbai/slug/${b.show.movieId}`}>
                        <Button size="sm" variant="outline">Leave a review</Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
