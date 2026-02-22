"use client";

import { useState } from "react";
import {
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { ImageUpload } from "@/components/forms/image-upload";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextArea } from "@/components/ui/textarea";
import {
  submitFoundUCard,
  reportLostUCard,
  type UCardSubmitResult,
} from "@/lib/api/ucard";
import { cn } from "@/lib/utils";

type Mode = "found" | "lost";

export default function UCardPage() {
  const [mode, setMode] = useState<Mode>("found");
  const [loading, setLoading] = useState(false);
  const [submitResult, setSubmitResult] = useState<UCardSubmitResult | null>(
    null
  );
  const [reportSuccess, setReportSuccess] = useState(false);
  const [spireId, setSpireId] = useState("");
  const [note, setNote] = useState("");

  const handleFoundUpload = async (file: File) => {
    setLoading(true);
    setSubmitResult(null);
    try {
      const result = await submitFoundUCard(file, note || undefined);
      setSubmitResult(result);
    } catch {
      toast.error("Failed to submit UCard. Please try again.");
      setSubmitResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReportLost = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = spireId.replace(/\D/g, "");
    if (trimmed.length !== 8) {
      toast.error("Please enter a valid 8-digit SPIRE ID.");
      return;
    }
    setLoading(true);
    setReportSuccess(false);
    try {
      await reportLostUCard(trimmed);
      setReportSuccess(true);
      setSpireId("");
      toast.success("Lost UCard reported. We’ll notify you if it’s found.");
    } catch {
      toast.error("Failed to report lost UCard. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-brand-600" />
        <h1 className="text-xl font-bold text-gray-900">UCard Recovery</h1>
      </div>

      {/* Mode tabs */}
      <div className="mb-6 flex gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("found");
            setSubmitResult(null);
            setReportSuccess(false);
          }}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-colors",
            mode === "found"
              ? "bg-white text-brand-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <Search className="h-4 w-4" />
          I Found a UCard
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("lost");
            setSubmitResult(null);
            setReportSuccess(false);
          }}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-colors",
            mode === "lost"
              ? "bg-white text-brand-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <Shield className="h-4 w-4" />
          I Lost My UCard
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === "found" ? (
          <motion.div
            key="found"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <p className="text-sm text-gray-500">
              Upload a photo of a found UCard. Our AI will extract the SPIRE ID
              and notify the owner if they reported it lost. Your SPIRE ID is
              never stored—only hashed for secure matching.
            </p>

            <TextArea
              id="note"
              label="Note for the owner (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Found at the library front desk"
              rows={2}
            />

            <ImageUpload
              onImageSelect={handleFoundUpload}
              onClear={() => setSubmitResult(null)}
            />

            {loading && (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="mb-3 h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
                <p className="text-sm text-gray-500">
                  Analyzing UCard and checking for matches...
                </p>
              </div>
            )}

            {submitResult && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <Card
                  className={
                    submitResult.matched
                      ? "border-green-200 bg-green-50/50"
                      : "border-amber-200 bg-amber-50/50"
                  }
                >
                  <div className="p-4">
                    {submitResult.matched ? (
                      <>
                        <CheckCircle className="mb-2 h-10 w-10 text-green-500" />
                        <h3 className="font-semibold text-green-800">
                          Owner Notified!
                        </h3>
                        <p className="mt-1 text-sm text-green-700">
                          {submitResult.message}
                        </p>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="mb-2 h-10 w-10 text-amber-600" />
                        <h3 className="font-semibold text-amber-800">
                          Card Submitted
                        </h3>
                        <p className="mt-1 text-sm text-amber-700">
                          {submitResult.message}
                        </p>
                        <p className="mt-2 text-xs text-amber-600">
                          If the owner hasn’t reported their card lost yet, they
                          may do so later and we’ll notify them.
                        </p>
                      </>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="lost"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <p className="text-sm text-gray-500">
              Report your lost UCard with your SPIRE ID (the 8-digit number on
              your card). We store only a secure hash—never your raw ID. If
              someone submits your card, we’ll email you.
            </p>

            {reportSuccess ? (
              <Card className="border-green-200 bg-green-50/50 p-6">
                <CheckCircle className="mx-auto mb-2 h-12 w-12 text-green-500" />
                <h3 className="text-center font-semibold text-green-800">
                  Lost UCard Reported
                </h3>
                <p className="mt-1 text-center text-sm text-green-700">
                  We’ll notify you by email if your UCard is submitted on
                  FoundU.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => setReportSuccess(false)}
                >
                  Report Another
                </Button>
              </Card>
            ) : (
              <form onSubmit={handleReportLost} className="space-y-4">
                <Input
                  id="spireId"
                  label="SPIRE ID (8 digits)"
                  value={spireId}
                  onChange={(e) =>
                    setSpireId(e.target.value.replace(/\D/g, "").slice(0, 8))
                  }
                  placeholder="12345678"
                  maxLength={8}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{8}"
                  autoComplete="off"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  className="w-full"
                  loading={loading}
                  disabled={spireId.replace(/\D/g, "").length !== 8}
                >
                  Report Lost UCard
                </Button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
