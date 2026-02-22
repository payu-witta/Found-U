"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageTransition } from "@/components/ui/page-transition";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Header />
      <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-3xl px-4 pb-24 pt-6 md:pb-8">
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />
    </AuthGuard>
  );
}
