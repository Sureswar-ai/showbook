"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, Skeleton, Badge } from "@/components/ui/primitives";
import { paiseToRupees, timeAgo } from "@/lib/utils/format";

interface AdminBooking {
  id: string;
  bookingNumber: string;
  status: string;
  totalPaise: number;
  createdAt: string;
  user: { name: string | null; phone: string };
  show: { movie: { title: string } };
}

export default function AdminBookingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () => api.get<AdminBooking[]>("/admin/bookings"),
  });
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Bookings</h1>
      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-left">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Movie</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((b) => (
                <tr key={b.id} className="border-b border-gray-100">
                  <td className="px-4 py-2 font-mono text-xs">{b.bookingNumber}</td>
                  <td className="px-4 py-2 text-xs">{b.user.name ?? b.user.phone}</td>
                  <td className="px-4 py-2">{b.show.movie.title}</td>
                  <td className="px-4 py-2 font-semibold">{paiseToRupees(b.totalPaise)}</td>
                  <td className="px-4 py-2">
                    <Badge variant={b.status === "CONFIRMED" ? "success" : b.status === "CANCELLED" ? "danger" : "warning"}>
                      {b.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">{timeAgo(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
