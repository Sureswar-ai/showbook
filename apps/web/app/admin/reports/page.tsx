"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, Skeleton } from "@/components/ui/primitives";
import { paiseToRupees } from "@/lib/utils/format";
import { format } from "date-fns";

interface OccupancyRow {
  showId: string;
  movieTitle: string;
  theaterName: string;
  screenName: string;
  startTime: string;
  totalSeats: number;
  bookedSeats: number;
  occupancyPct: number;
}

interface RevenueDto {
  totalBookings: number;
  totalRevenuePaise: number;
  daily: { date: string; count: number; totalPaise: number }[];
}

export default function AdminReportsPage() {
  const { data: revenue } = useQuery({
    queryKey: ["admin-revenue-report"],
    queryFn: () => api.get<RevenueDto>("/admin/reports/revenue"),
  });
  const { data: occupancy, isLoading } = useQuery({
    queryKey: ["admin-occupancy"],
    queryFn: () => api.get<OccupancyRow[]>("/admin/reports/occupancy"),
  });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Reports</h1>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Revenue (last 30 days)</h2>
        <div className="text-3xl font-bold">{revenue ? paiseToRupees(revenue.totalRevenuePaise) : "—"}</div>
        <div className="text-sm text-gray-500">
          {revenue?.totalBookings ?? 0} confirmed bookings
        </div>
      </Card>

      <Card className="overflow-hidden">
        <h2 className="font-semibold p-4 border-b border-gray-200">Upcoming show occupancy</h2>
        {isLoading ? (
          <div className="p-4"><Skeleton className="h-64 w-full" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-left">
              <tr>
                <th className="px-4 py-2">Movie</th>
                <th className="px-4 py-2">Venue</th>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Occupancy</th>
              </tr>
            </thead>
            <tbody>
              {occupancy?.map((r) => (
                <tr key={r.showId} className="border-b border-gray-100">
                  <td className="px-4 py-2 font-medium">{r.movieTitle}</td>
                  <td className="px-4 py-2 text-xs">{r.theaterName} · {r.screenName}</td>
                  <td className="px-4 py-2 text-xs">{format(new Date(r.startTime), "d MMM · h:mm a")}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full bg-brand"
                          style={{ width: `${r.occupancyPct}%` }}
                        />
                      </div>
                      <span className="w-10 text-xs font-semibold">{r.occupancyPct}%</span>
                      <span className="text-xs text-gray-500">({r.bookedSeats}/{r.totalSeats})</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
