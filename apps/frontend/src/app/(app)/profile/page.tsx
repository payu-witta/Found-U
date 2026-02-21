"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, Package, Eye } from "lucide-react";
import Link from "next/link";
import { useUserItems } from "@/lib/hooks/use-items";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ItemGrid } from "@/components/items/item-grid";

export default function ProfilePage() {
  const { data: session } = useSession();
  const { data, isLoading } = useUserItems();

  const items = data?.items ?? [];
  const lostItems = items.filter((i) => i.type === "lost");
  const foundItems = items.filter((i) => i.type === "found");

  return (
    <div>
      {/* Profile header */}
      <Card className="mb-6 p-6 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
          {session?.user?.name?.[0]?.toUpperCase() || "U"}
        </div>
        <h1 className="text-xl font-bold text-gray-900">
          {session?.user?.name || "Student"}
        </h1>
        <p className="text-sm text-gray-500">{session?.user?.email}</p>

        <div className="mt-4 flex justify-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{lostItems.length}</p>
            <p className="text-xs text-gray-500">Lost</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{foundItems.length}</p>
            <p className="text-xs text-gray-500">Found</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {items.filter((i) => i.status === "resolved").length}
            </p>
            <p className="text-xs text-gray-500">Resolved</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </Card>

      {/* User's items */}
      <h2 className="mb-3 text-lg font-bold text-gray-900">Your Items</h2>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-gray-200">
              <Skeleton className="aspect-square rounded-none" />
              <div className="space-y-2 p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ItemGrid items={items} />
      )}
    </div>
  );
}
