"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, Skeleton, Badge } from "@/components/ui/primitives";

interface AdminTheater {
  id: string;
  name: string;
  chain: string | null;
  city: { name: string };
  address: string;
  amenities: string;
}

function parseArr(s: string): string[] {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}

export default function AdminTheatersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-theaters"],
    queryFn: () => api.get<AdminTheater[]>("/admin/theaters"),
  });
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Theaters</h1>
      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {data?.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.chain} · {t.city.name}</div>
                </div>
              </div>
              <div className="text-xs text-gray-600 mt-2">{t.address}</div>
              <div className="flex flex-wrap gap-1 mt-2">
                {parseArr(t.amenities).map((a) => (
                  <Badge key={a} variant="outline" className="text-[10px]">{a.replaceAll("_", " ")}</Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
