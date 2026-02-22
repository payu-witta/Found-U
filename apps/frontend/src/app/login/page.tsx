"use client";

import { Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { motionEase, motionTiming } from "@/lib/motion";

function LoginContent() {
  const { status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const error = params.get("error");

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/feed");
    }
  }, [status, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-100 via-white to-gray-100 px-4 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionTiming.slow, ease: motionEase.out }}
        className="w-full max-w-sm rounded-3xl elevated-surface soft-border p-8 text-center"
      >
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700 shadow-[0_14px_28px_rgb(136_19_55/0.28)]">
          <span className="text-2xl font-bold text-white">F</span>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">FoundU</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          AI-powered lost &amp; found for UMass Amherst
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">
            {error === "AccessDenied"
              ? "Only @umass.edu email addresses are allowed."
              : "Something went wrong. Please try again."}
          </div>
        )}

        <Button
          size="lg"
          className="mt-8 w-full gap-3"
          onClick={() => signIn("google", { callbackUrl: "/feed" })}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with UMass Google
        </Button>

        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          Only @umass.edu accounts are accepted
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
