"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Shield, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCreateClaim, useVerifyClaim } from "@/lib/hooks/use-claims";
import type { Claim, VerificationResult } from "@/lib/types";

export default function ClaimPage() {
  const { id: itemId } = useParams<{ id: string }>();
  const router = useRouter();
  const [step, setStep] = useState<"form" | "verify" | "result">("form");
  const [message, setMessage] = useState("");
  const [claim, setClaim] = useState<Claim | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);

  const createClaim = useCreateClaim();
  const verifyClaim = useVerifyClaim();

  async function handleSubmitClaim() {
    try {
      const newClaim = await createClaim.mutateAsync({
        item_id: itemId,
        message,
      });
      setClaim(newClaim);
      if (newClaim.verification_question) {
        setStep("verify");
      } else {
        setResult({
          claim_id: newClaim.id,
          status: "pending",
          message: "Your claim has been submitted and is under review.",
        });
        setStep("result");
      }
    } catch {
      toast.error("Failed to submit claim.");
    }
  }

  async function handleVerify() {
    if (!claim) return;
    try {
      const verifyResult = await verifyClaim.mutateAsync({
        claim_id: claim.id,
        answer,
      });
      setResult(verifyResult);
      setStep("result");
    } catch {
      toast.error("Verification failed.");
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
              Describe why you believe this item belongs to you. Our AI will
              generate a verification question to confirm ownership.
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

        {step === "verify" && claim?.verification_question && (
          <motion.div
            key="verify"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <Card className="border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-950/50">
              <h3 className="mb-1 text-sm font-semibold text-brand-800 dark:text-brand-300">
                Verification Question
              </h3>
              <p className="text-sm text-brand-700 dark:text-brand-400">
                {claim.verification_question}
              </p>
            </Card>
            <Input
              id="answer"
              label="Your Answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer..."
            />
            <Button
              className="w-full"
              onClick={handleVerify}
              loading={verifyClaim.isPending}
              disabled={!answer.trim()}
            >
              Verify Ownership
            </Button>
          </motion.div>
        )}

        {step === "result" && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            {result.status === "verified" ? (
              <div className="space-y-3">
                <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">Verified!</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Your ownership has been confirmed. The poster will be notified.
                </p>
              </div>
            ) : result.status === "rejected" ? (
              <div className="space-y-3">
                <XCircle className="mx-auto h-16 w-16 text-red-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">
                  Verification Failed
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  The answer didn&apos;t match. You can try again or contact support.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <Loader2 className="mx-auto h-16 w-16 animate-spin text-brand-600" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">
                  Claim Submitted
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {result.message || "Your claim is being reviewed."}
                </p>
              </div>
            )}
            <Badge variant={result.status} className="mt-4">
              {result.status}
            </Badge>
            <Button
              variant="outline"
              className="mt-6 w-full"
              onClick={() => router.push("/feed")}
            >
              Back to Feed
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
