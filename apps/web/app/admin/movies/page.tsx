"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, Skeleton, Badge } from "@/components/ui/primitives";

interface AdminMovie {
  id: string;
  title: string;
  status: string;
  languages: string;
  formats: string;
  genres: string;
  certificate: string;
  runtimeMinutes: number;
  releaseDate: string;
}

function parseArr(s: string): string[] {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}

export default function AdminMoviesPage() {
  const { data: movies, isLoading } = useQuery({
    queryKey: ["admin-movies"],
    queryFn: () => api.get<AdminMovie[]>("/admin/movies"),
  });
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Movies</h1>
      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left">
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Languages</th>
                <th className="px-4 py-2">Formats</th>
                <th className="px-4 py-2">Runtime</th>
                <th className="px-4 py-2">Cert</th>
              </tr>
            </thead>
            <tbody>
              {movies?.map((m) => (
                <tr key={m.id} className="border-b border-gray-100">
                  <td className="px-4 py-2 font-medium">{m.title}</td>
                  <td className="px-4 py-2">
                    <Badge variant={m.status === "NOW_SHOWING" ? "success" : m.status === "UPCOMING" ? "warning" : "outline"}>
                      {m.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-xs">{parseArr(m.languages).join(", ")}</td>
                  <td className="px-4 py-2 text-xs">{parseArr(m.formats).join(", ")}</td>
                  <td className="px-4 py-2">{m.runtimeMinutes}m</td>
                  <td className="px-4 py-2">{m.certificate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
