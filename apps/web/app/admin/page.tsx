"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, Skeleton } from "@/components/ui/primitives";
import { paiseToRupees } from "@/lib/utils/format";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface RevenueDto {
  totalBookings: number;
  totalRevenuePaise: number;
  daily: { date: string; count: number; totalPaise: number }[];
}

export default function AdminDashboard() {
  const { data: revenue, isLoading } = useQuery({
    queryKey: ["admin-revenue"],
    queryFn: () => api.get<RevenueDto>(`/admin/reports/revenue`),
  });

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Bookings (30d)" value={revenue?.totalBookings.toString() ?? "—"} loading={isLoading} />
        <Stat
          label="Revenue (30d)"
          value={revenue ? paiseToRupees(revenue.totalRevenuePaise) : "—"}
          loading={isLoading}
        />
        <Stat label="Active cities" value="10" loading={false} />
        <Stat label="Theaters" value="12" loading={false} />
      </div>

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Daily revenue</h2>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : revenue && revenue.daily.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue.daily.map((d) => ({ date: d.date.slice(5), revenue: d.totalPaise / 100 }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#e11d48" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-sm text-gray-500 py-12 text-center">
            No confirmed bookings yet in the last 30 days.
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-gray-500">{label}</div>
      {loading ? (
        <Skeleton className="h-7 w-20 mt-2" />
      ) : (
        <div className="text-2xl font-bold mt-1">{value}</div>
      )}
    </Card>
  );
}
