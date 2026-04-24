"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { FnbItemDto, BookingDto } from "@showbook/types";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { Button, Card, Skeleton } from "@/components/ui/primitives";
import { paiseToRupees } from "@/lib/utils/format";
import { Minus, Plus } from "lucide-react";

export default function FoodBeveragePage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>({});

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["fnb"],
    queryFn: () => api.get<FnbItemDto[]>("/fnb"),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const lines = Object.entries(qty)
        .filter(([, q]) => q > 0)
        .map(([itemId, quantity]) => ({ itemId, quantity }));
      return api.post<BookingDto>(`/bookings/${bookingId}/add-fnb`, { items: lines });
    },
    onSuccess: () => router.push(`/checkout/${bookingId}`),
  });

  const total = useMemo(() => {
    let sum = 0;
    for (const [itemId, q] of Object.entries(qty)) {
      if (q > 0) {
        const item = items.find((i) => i.id === itemId);
        if (item) sum += item.pricePaise * q;
      }
    }
    return sum;
  }, [qty, items]);

  function bump(itemId: string, delta: number) {
    setQty((q) => ({ ...q, [itemId]: Math.max(0, (q[itemId] ?? 0) + delta) }));
  }

  const byCategory = useMemo(() => {
    const m = new Map<string, FnbItemDto[]>();
    for (const i of items) {
      const arr = m.get(i.category) ?? [];
      arr.push(i);
      m.set(i.category, arr);
    }
    return m;
  }, [items]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">Add snacks & drinks</h1>
      <p className="text-gray-600 mb-6">Skip if you don't want anything.</p>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="space-y-8">
          {[...byCategory.entries()].map(([category, list]) => (
            <section key={category}>
              <h2 className="text-lg font-semibold mb-3 capitalize">{category.toLowerCase()}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {list.map((item) => (
                  <Card key={item.id} className="p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full aspect-[4/3] object-cover rounded"
                    />
                    <div className="mt-2">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-gray-500 line-clamp-2 min-h-[32px]">
                        {item.description}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="font-semibold">{paiseToRupees(item.pricePaise)}</div>
                        {(qty[item.id] ?? 0) === 0 ? (
                          <Button size="sm" variant="outline" onClick={() => bump(item.id, 1)}>
                            Add
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button onClick={() => bump(item.id, -1)} className="h-7 w-7 rounded border border-gray-300 hover:bg-gray-100">
                              <Minus className="h-3 w-3 mx-auto" />
                            </button>
                            <span className="w-6 text-center font-semibold">{qty[item.id]}</span>
                            <button onClick={() => bump(item.id, 1)} className="h-7 w-7 rounded border border-gray-300 hover:bg-gray-100">
                              <Plus className="h-3 w-3 mx-auto" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="sticky bottom-0 mt-8 bg-white border-t border-gray-200 -mx-4 px-4 py-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">
            {total > 0 ? `F&B total: ${paiseToRupees(total)}` : "No F&B items selected"}
          </div>
          <div className="text-xs text-gray-500">Tickets are already in your cart.</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="lg" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Skip
          </Button>
          <Button size="lg" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
