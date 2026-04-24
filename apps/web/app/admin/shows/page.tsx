"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, Skeleton, Badge } from "@/components/ui/primitives";
import { showTimeLabel } from "@/lib/utils/format";

interface AdminShow {
  id: string;
  startTime: string;
  language: string;
  format: string;
  status: string;
  movie: { title: string };
  screen: { name: string; theater: { name: string } };
}

export default function AdminShowsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-shows"],
    queryFn: () => api.get<AdminShow[]>("/admin/shows"),
  });
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Shows</h1>
      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-left">
              <tr>
                <th className="px-4 py-2">Movie</th>
                <th className="px-4 py-2">Theater · Screen</th>
                <th className="px-4 py-2">Start</th>
                <th className="px-4 py-2">Format</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.slice(0, 80).map((s) => (
                <tr key={s.id} className="border-b border-gray-100">
                  <td className="px-4 py-2 font-medium">{s.movie.title}</td>
                  <td className="px-4 py-2">{s.screen.theater.name} · {s.screen.name}</td>
                  <td className="px-4 py-2 text-xs">{showTimeLabel(s.startTime)}</td>
                  <td className="px-4 py-2 text-xs">{s.format} · {s.language}</td>
                  <td className="px-4 py-2">
                    <Badge variant={s.status === "SCHEDULED" ? "success" : "outline"}>{s.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
