"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold text-gray-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-gray-500">
        An unexpected error occurred. Please try again.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try Again
      </Button>
    </div>
  );
}
