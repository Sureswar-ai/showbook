"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { SeatLayoutDto, LockSeatsResponse } from "@showbook/types";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Button, Skeleton, Badge } from "@/components/ui/primitives";
import { useAuth } from "@/stores/authStore";
import { toast } from "sonner";
import { paiseToRupees, showTimeLabel } from "@/lib/utils/format";
import { useShowSocket } from "@/hooks/useShowSocket";
import { useCart } from "@/stores/cartStore";

const MAX_SEATS = 10;

export default function SeatLayoutPage() {
  const { showId } = useParams<{ showId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { selectSeats: setCartSeats, setIntent, clear: clearCart } = useCart();

  const [selected, setSelected] = useState<string[]>([]);
  const [locking, setLocking] = useState(false);

  const { data: layout, isLoading } = useQuery({
    queryKey: ["seat-layout", showId, user?.id],
    queryFn: () =>
      api.get<SeatLayoutDto>(
        `/shows/${showId}/seats${user ? `?userId=${user.id}` : ""}`
      ),
    refetchInterval: 30_000,
  });
  const { data: show } = useQuery({
    queryKey: ["show", showId],
    queryFn: () => api.get<{ movie: { title: string; certificate: string }; theater: { name: string }; startTime: string; format: string; language: string; screenName: string }>(`/shows/${showId}`),
  });

  const socket = useShowSocket(showId, user?.id ?? null);

  // Merge realtime state with layout
  const seatsById = useMemo(() => {
    const map = new Map<string, SeatLayoutDto["seats"][number] & { realtimeLocked?: boolean }>();
    if (!layout) return map;
    for (const s of layout.seats) {
      const realtimeLocked = !!socket.lockedByOthers[s.id];
      const realtimeBooked = !!socket.booked[s.id];
      const status = realtimeBooked ? ("BOOKED" as const) : realtimeLocked ? ("LOCKED" as const) : s.status;
      map.set(s.id, { ...s, status, realtimeLocked });
    }
    return map;
  }, [layout, socket.lockedByOthers, socket.booked]);

  const categoriesById = useMemo(() => {
    const map = new Map<string, NonNullable<typeof layout>["categories"][number]>();
    if (layout) for (const c of layout.categories) map.set(c.id, c);
    return map;
  }, [layout]);

  // Build grid rows
  const grid = useMemo(() => {
    if (!layout) return [] as { rowLabel: string; seats: (SeatLayoutDto["seats"][number] | null)[] }[];
    const byRow = new Map<string, SeatLayoutDto["seats"]>();
    for (const s of layout.seats) {
      const r = byRow.get(s.rowLabel) ?? [];
      r.push(s);
      byRow.set(s.rowLabel, r);
    }
    const rows = [...byRow.keys()].sort();
    return rows.map((rowLabel) => {
      const seats = [...(byRow.get(rowLabel) ?? [])].sort(
        (a, b) => a.seatNumber - b.seatNumber
      );
      const arr: (SeatLayoutDto["seats"][number] | null)[] = [];
      for (let col = 1; col <= layout.screen.cols; col++) {
        const seat = seats.find((s) => s.seatNumber === col);
        arr.push(seat ?? null);
      }
      return { rowLabel, seats: arr };
    });
  }, [layout]);

  function toggleSeat(seatId: string) {
    const info = seatsById.get(seatId);
    if (!info) return;
    if (info.status === "BOOKED") return;
    if (info.status === "LOCKED" && !info.lockedByMe) {
      toast.warning("That seat was just taken.");
      return;
    }
    setSelected((prev) => {
      if (prev.includes(seatId)) return prev.filter((x) => x !== seatId);
      if (prev.length >= MAX_SEATS) {
        toast.warning(`Max ${MAX_SEATS} seats per booking.`);
        return prev;
      }
      return [...prev, seatId];
    });
  }

  const totalPaise = useMemo(() => {
    let sum = 0;
    for (const sid of selected) {
      const s = seatsById.get(sid);
      const cat = s ? categoriesById.get(s.categoryId) : null;
      if (cat) sum += cat.basePricePaise;
    }
    return sum;
  }, [selected, seatsById, categoriesById]);

  const convenienceFee = useMemo(() => {
    let sum = 0;
    for (const sid of selected) {
      const s = seatsById.get(sid);
      const cat = s ? categoriesById.get(s.categoryId) : null;
      if (cat) sum += cat.convenienceFeePaise;
    }
    return sum;
  }, [selected, seatsById, categoriesById]);

  const lockMutation = useMutation({
    mutationFn: async () => {
      const lockRes = await api.post<LockSeatsResponse>(`/shows/${showId}/lock-seats`, {
        seatIds: selected,
      });
      if (lockRes.failedSeatIds.length > 0) {
        throw new Error(`Some seats are no longer available: ${lockRes.failedSeatIds.length} failed`);
      }
      // Create booking intent
      const booking = await api.post<{ id: string }>("/bookings/intent", {
        showId,
        seatIds: selected,
      });
      return { bookingId: booking.id, lockExpiresAt: lockRes.lockExpiresAt };
    },
    onSuccess: (data) => {
      setIntent(data.bookingId, data.lockExpiresAt);
      setCartSeats(selected);
      router.push(`/food-beverage/${data.bookingId}`);
    },
    onError: (err) => {
      toast.error((err as Error).message);
      qc.invalidateQueries({ queryKey: ["seat-layout", showId] });
    },
  });

  async function proceed() {
    if (selected.length === 0) return;
    if (!user) {
      toast.info("Please sign in to continue");
      router.push("/auth/login");
      return;
    }
    setLocking(true);
    try {
      await lockMutation.mutateAsync();
    } finally {
      setLocking(false);
    }
  }

  useEffect(() => {
    return () => clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading || !layout) {
    return (
      <div className="p-6">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Show meta */}
      {show && (
        <div className="mb-5 border-b border-gray-200 pb-4">
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className="text-xl md:text-2xl font-bold">{show.movie.title}</h1>
            <Badge>{show.movie.certificate}</Badge>
            <Badge variant="outline">{show.format}</Badge>
            <Badge variant="outline">{show.language}</Badge>
          </div>
          <div className="text-sm text-gray-600">
            {show.theater.name} · {show.screenName} · {showTimeLabel(show.startTime)}
          </div>
          <div className="text-xs mt-1">
            {socket.connected ? (
              <span className="text-green-600">● Live — seat availability updates in real time</span>
            ) : (
              <span className="text-gray-400">○ Connecting…</span>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        {layout.categories.map((c) => (
          <div key={c.id} className="flex items-center gap-2 text-xs">
            <span className="h-3 w-3 rounded" style={{ background: c.colorHex }} />
            <span className="font-medium">{c.name}</span>
            <span className="text-gray-500">{paiseToRupees(c.basePricePaise)}</span>
          </div>
        ))}
      </div>

      <div className="text-center text-xs text-gray-500 mb-1 uppercase tracking-[0.3em]">
        All eyes this way please ↑
      </div>
      <div className="mx-auto mb-6 h-1.5 bg-gradient-to-b from-gray-400 to-transparent rounded-full max-w-md" />

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {grid.map(({ rowLabel, seats }) => (
            <div key={rowLabel} className="flex gap-1 items-center mb-1">
              <span className="w-6 text-xs text-gray-400 text-center font-medium">{rowLabel}</span>
              {seats.map((seat, colIdx) => {
                if (!seat) return <span key={colIdx} className="h-7 w-7" />;
                const info = seatsById.get(seat.id)!;
                const cat = categoriesById.get(seat.categoryId);
                const isSelected = selected.includes(seat.id);
                const aisleAfter = layout.aisles.some((a) => a.afterCol === colIdx + 1);
                let cls = "bg-white border-gray-300 hover:border-gray-500 cursor-pointer";
                if (info.status === "BOOKED") cls = "bg-gray-200 text-gray-400 cursor-not-allowed";
                else if (info.status === "LOCKED" && !info.lockedByMe)
                  cls = "bg-orange-100 text-orange-400 cursor-not-allowed";
                if (isSelected) cls = "text-white border-transparent";
                return (
                  <span key={seat.id} className={`flex items-center ${aisleAfter ? "pr-3" : ""}`}>
                    <button
                      onClick={() => toggleSeat(seat.id)}
                      className={`h-7 w-7 text-[10px] rounded border-2 transition-colors ${cls}`}
                      style={isSelected && cat ? { background: cat.colorHex } : undefined}
                      title={`${rowLabel}${seat.seatNumber} · ${cat?.name ?? ""}`}
                      disabled={info.status === "BOOKED" || (info.status === "LOCKED" && !info.lockedByMe)}
                    >
                      {seat.seatNumber}
                    </button>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 mt-8 bg-white border-t border-gray-200 -mx-4 px-4 py-4 md:rounded-t-xl md:shadow-lg flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">
            {selected.length === 0
              ? "Select seats to continue"
              : `${selected.length} seat${selected.length > 1 ? "s" : ""} selected`}
          </div>
          {selected.length > 0 && (
            <div className="text-xs text-gray-500">
              Subtotal {paiseToRupees(totalPaise)} + fees {paiseToRupees(convenienceFee)}
            </div>
          )}
        </div>
        <Button size="lg" onClick={proceed} disabled={selected.length === 0 || locking}>
          {locking ? "Locking…" : `Pay ${paiseToRupees(totalPaise + convenienceFee)}`}
        </Button>
      </div>
    </div>
  );
}
