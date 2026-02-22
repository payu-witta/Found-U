"use client";

import { motion } from "framer-motion";
import { FoundItemForm } from "@/components/forms/found-item-form";
import { motionEase, motionTiming } from "@/lib/motion";

export default function PostFoundPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionTiming.base, ease: motionEase.out }}
      className="py-2"
    >
      <div className="mb-5">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
          Report Found Item
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Clear photo + precise location helps reunite items faster.
        </p>
      </div>
      <FoundItemForm />
    </motion.div>
  );
}
