"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ArrowRight, Search, Shield, PackagePlus, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motionEase, motionTiming } from "@/lib/motion";

export default function Home() {
  const { status } = useSession();
  const appHref = status === "authenticated" ? "/feed" : "/login";
  const actionHref = (href: string) => (status === "authenticated" ? href : "/login");
  const entryCards = [
    {
      title: "Report Lost Item",
      subtitle: "Share details clearly so others can identify it.",
      icon: Shield,
      href: "/post/lost",
    },
    {
      title: "Report Found Item",
      subtitle: "Post a photo and location in under a minute.",
      icon: PackagePlus,
      href: "/post/found",
    },
    {
      title: "Search Items",
      subtitle: "Use text or image search to find likely matches.",
      icon: Search,
      href: "/search",
    },
  ];

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-6 pb-16 pt-12 md:pt-20">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionTiming.slow, ease: motionEase.out }}
        className="mx-auto max-w-2xl text-center"
      >
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-700 text-xl font-semibold text-white shadow-[0_12px_28px_rgb(136_19_55/0.3)]">
          F
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-gray-50 md:text-5xl">
          Lost and found,
          <br />
          thoughtfully designed.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-gray-500 dark:text-gray-400">
          A calm, trusted campus utility for reporting lost items, posting found
          items, searching quickly, and handling claims with confidence.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href={appHref}>
            <Button size="lg" className="gap-2">
              {status === "authenticated" ? "Open App" : "Get Started"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={status === "authenticated" ? "/search" : "/login"}>
            <Button size="lg" variant="outline">
              Explore Search
            </Button>
          </Link>
        </div>
      </motion.div>

      <div className="mx-auto mt-14 grid max-w-4xl gap-4 md:grid-cols-3">
        {entryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={actionHref(card.href)} className="group">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.08 + index * 0.05,
                  duration: motionTiming.base,
                  ease: motionEase.out,
                }}
                className="elevated-surface soft-border rounded-3xl p-5 transition-transform duration-300 group-hover:-translate-y-0.5"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900/5 text-gray-700 dark:bg-white/10 dark:text-gray-200">
                  <Icon className="h-4 w-4" />
                </div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {card.title}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {card.subtitle}
                </p>
              </motion.div>
            </Link>
          );
        })}
      </div>

      <div className="mx-auto mt-8 flex max-w-4xl items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <CreditCard className="h-4 w-4" />
        Includes UCard recovery, notifications, instant claims, and secure
        verification.
      </div>
    </div>
  );
}
