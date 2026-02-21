"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Header />
      <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-2xl px-4 pb-20 pt-4 md:pb-4">
        {children}
      </main>
      <BottomNav />
    </AuthGuard>
  );
}
