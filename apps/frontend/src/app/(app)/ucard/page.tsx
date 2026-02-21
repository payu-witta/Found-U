"use client";

import { useState } from "react";
import { CreditCard, CheckCircle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ImageUpload } from "@/components/forms/image-upload";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { matchUCard } from "@/lib/api/ai";
import type { Item } from "@/lib/types";

export default function UCardPage() {
  const [loading, setLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<{
    match: Item | null;
    confidence: number;
  } | null>(null);

  async function handleUpload(file: File) {
    setLoading(true);
    try {
      const result = await matchUCard(file);
      setMatchResult(result);
    } catch {
      setMatchResult({ match: null, confidence: 0 });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-brand-600" />
        <h1 className="text-xl font-bold text-gray-900">UCard Recovery</h1>
      </div>

      <p className="mb-4 text-sm text-gray-500">
        Upload a photo of a found UCard and our AI will try to match it with
        reported lost UCards.
      </p>

      <ImageUpload
        onImageSelect={handleUpload}
        onClear={() => setMatchResult(null)}
      />

      {loading && (
        <div className="mt-6 flex flex-col items-center py-8 text-center">
          <div className="mb-3 h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
          <p className="text-sm text-gray-500">Searching for UCard match...</p>
        </div>
      )}

      <AnimatePresence>
        {matchResult && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6"
          >
            {matchResult.match ? (
              <Card className="overflow-hidden">
                <div className="bg-green-50 p-4 text-center">
                  <CheckCircle className="mx-auto mb-2 h-10 w-10 text-green-500" />
                  <h3 className="font-semibold text-green-800">Match Found!</h3>
                  <p className="text-sm text-green-600">
                    Confidence: {Math.round(matchResult.confidence * 100)}%
                  </p>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-16 w-16 overflow-hidden rounded-lg">
                      <Image
                        src={matchResult.match.image_url}
                        alt="Matched UCard"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {matchResult.match.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {matchResult.match.location}
                      </p>
                      <Badge variant={matchResult.match.status} className="mt-1">
                        {matchResult.match.status}
                      </Badge>
                    </div>
                  </div>
                  <Link href={`/claim/${matchResult.match.id}`}>
                    <Button className="mt-4 w-full">Claim This UCard</Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <Card className="p-6 text-center">
                <XCircle className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                <h3 className="font-semibold text-gray-900">No Match Found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  We couldn&apos;t find a matching UCard in our system. Try
                  posting it as a found item instead.
                </p>
                <Link href="/post/found">
                  <Button variant="outline" className="mt-4">
                    Post as Found Item
                  </Button>
                </Link>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
