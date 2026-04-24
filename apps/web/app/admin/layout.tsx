"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/stores/authStore";
import { cn } from "@/lib/utils/cn";
import { Clapperboard, Building2, CalendarClock, BadgePercent, LineChart, Ticket, LayoutDashboard } from "lucide-react";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/movies", label: "Movies", icon: Clapperboard },
  { href: "/admin/theaters", label: "Theaters", icon: Building2 },
  { href: "/admin/shows", label: "Shows", icon: CalendarClock },
  { href: "/admin/bookings", label: "Bookings", icon: Ticket },
  { href: "/admin/offers", label: "Offers", icon: BadgePercent },
  { href: "/admin/reports", label: "Reports", icon: LineChart },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user === null) return; // loading
    if (!user || (user.role !== "ADMIN" && user.role !== "CITY_ADMIN")) {
      router.replace("/");
    }
  }, [user, router]);

  if (!user || (user.role !== "ADMIN" && user.role !== "CITY_ADMIN")) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-center">
        Checking permissions…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 grid md:grid-cols-[220px_1fr] gap-6">
      <aside>
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-3">Admin</div>
        <nav className="space-y-1">
          {nav.map((n) => {
            const active = pathname === n.href;
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-brand text-white" : "hover:bg-gray-100 text-gray-700"
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}
