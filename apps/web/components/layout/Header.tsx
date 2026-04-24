"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/primitives";
import { useAuth } from "@/stores/authStore";
import { useCity } from "@/stores/cityStore";
import { api } from "@/lib/api/client";
import { CitySelector } from "./CitySelector";
import { SearchBar } from "./SearchBar";
import { LogOut, Menu, User2, Bell } from "lucide-react";
import { useState } from "react";

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { citySlug } = useCity();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    try {
      await api.post("/auth/logout", { refreshToken: document.cookie });
    } catch {
      /* ignore */
    }
    logout();
    router.push("/");
  }

  const isAdmin = user?.role === "ADMIN" || user?.role === "CITY_ADMIN";

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center gap-4">
        <Link href={`/explore/${citySlug}`} className="font-black text-2xl tracking-tight text-brand">
          Show<span className="text-gray-900">Book</span>
        </Link>
        <div className="hidden md:block flex-1 max-w-xl">
          <SearchBar />
        </div>
        <nav className="hidden md:flex items-center gap-2">
          <CitySelector />
          {user ? (
            <>
              <Link href="/profile/inbox" className="p-2 rounded-full hover:bg-gray-100" aria-label="Inbox">
                <Bell className="h-5 w-5" />
              </Link>
              {isAdmin && (
                <Link href="/admin" className="text-sm font-medium text-brand hover:underline">
                  Admin
                </Link>
              )}
              <Link href="/profile" className="flex items-center gap-2 text-sm font-medium">
                <User2 className="h-4 w-4" />
                {user.name ?? user.phone}
              </Link>
              <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Link href="/auth/login">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </nav>
        <button
          className="md:hidden p-2 rounded hover:bg-gray-100"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 px-4 py-3 space-y-3">
          <SearchBar />
          <div className="flex items-center justify-between">
            <CitySelector />
            {user ? (
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <Link href="/admin" className="text-sm text-brand">Admin</Link>
                )}
                <Link href="/profile" className="text-sm font-medium">
                  {user.name ?? user.phone}
                </Link>
                <button onClick={handleLogout} aria-label="Logout">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link href="/auth/login">
                <Button size="sm">Sign in</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
