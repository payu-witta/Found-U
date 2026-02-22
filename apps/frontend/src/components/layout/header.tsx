"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Search, Bell, CreditCard, User, LogOut } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getUnreadNotificationCount } from "@/lib/api/notifications";

export function Header() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: unreadData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadNotificationCount,
    enabled: !!session,
    refetchInterval: 60_000,
  });
  const unreadCount = unreadData?.unreadCount ?? 0;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-950/80">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <Link href="/feed" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">
            F
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-gray-50">FoundU</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/search"
            className="rounded-lg p-2 text-gray-600 transition-all duration-200 ease-out hover:scale-105 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link
            href="/ucard"
            className="rounded-lg p-2 text-gray-600 transition-all duration-200 ease-out hover:scale-105 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="UCard"
          >
            <CreditCard className="h-5 w-5" />
          </Link>
          <Link
            href="/notifications"
            className="relative rounded-lg p-2 text-gray-600 transition-all duration-200 ease-out hover:scale-105 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
          <ThemeToggle />

          {session && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-700 transition-transform duration-200 ease-out hover:scale-105 active:scale-95 dark:bg-brand-900/50 dark:text-brand-300"
                aria-label="User menu"
              >
                {session.user?.name?.[0]?.toUpperCase() || "U"}
              </button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <button
                      onClick={() => signOut()}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
