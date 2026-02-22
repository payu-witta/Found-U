"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Shield, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCreateClaim } from "@/lib/hooks/use-claims";

export default function ClaimPage() {
  const { id: itemId } = useParams<{ id: string }>();
  const router = useRouter();
  const [step, setStep] = useState<"form" | "result">("form");
  const [message, setMessage] = useState("");
  const [claimId, setClaimId] = useState<string | null>(null);

  const createClaim = useCreateClaim();

  async function handleSubmitClaim() {
    try {
      const claim = await createClaim.mutateAsync({
        item_id: itemId,
        message,
      });
      setClaimId(claim.id);
      setStep("result");
    } catch {
      toast.error("Failed to submit claim.");
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mb-6 flex items-center gap-2">
        <Shield className="h-5 w-5 text-brand-600 dark:text-brand-400" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">Claim Item</h1>
      </div>

      <AnimatePresence mode="wait">
        {step === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Describe why you believe this item belongs to you. Include any
              details that will help the finder confirm your ownership.
            </p>
            <TextArea
              id="message"
              label="Your Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the item in detail to prove ownership..."
              rows={4}
            />
            <Button
              className="w-full"
              onClick={handleSubmitClaim}
              loading={createClaim.isPending}
              disabled={!message.trim()}
            >
              Submit Claim
            </Button>
          </motion.div>
        )}

        {step === "result" && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">
              Claim Submitted
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your claim has been submitted. The finder will review it and notify
              you if it&apos;s approved.
            </p>
            <Badge variant="pending" className="mt-4">
              Pending
            </Badge>
            <div className="mt-6 flex flex-col gap-2">
              {claimId && (
                <Button
                  onClick={() => router.push(`/claims/status/${claimId}`)}
                >
                  View Claim Status
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/feed")}
              >
                Back to Feed
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
