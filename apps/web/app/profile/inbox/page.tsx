"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { NotificationDto } from "@showbook/types";
import { Card, Skeleton } from "@/components/ui/primitives";
import { timeAgo } from "@/lib/utils/format";
import { useAuth } from "@/stores/authStore";
import { useRouter } from "next/navigation";

export default function InboxPage() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: notes, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<NotificationDto[]>("/notifications"),
    enabled: !!user,
  });
  const markRead = useMutation({
    mutationFn: (id: string) => api.patch<{ success: true }>(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (!user) {
    if (typeof window !== "undefined") router.push("/auth/login");
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Inbox</h1>
      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !notes || notes.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No notifications yet.</div>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <Card
              key={n.id}
              className={`p-4 cursor-pointer ${n.readAt ? "opacity-70" : "border-brand"}`}
              onClick={() => !n.readAt && markRead.mutate(n.id)}
            >
              <div className="flex justify-between">
                <div className="font-semibold">{n.title}</div>
                <div className="text-xs text-gray-500">{timeAgo(n.createdAt)}</div>
              </div>
              <div className="text-sm text-gray-700 mt-1">{n.body}</div>
              {!n.readAt && <div className="text-[10px] text-brand mt-1 font-semibold">● UNREAD</div>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
