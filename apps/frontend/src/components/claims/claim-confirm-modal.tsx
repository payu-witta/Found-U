"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getClaimPreview, submitClaim } from "@/lib/api/claims";
import type { ClaimPreviewResult } from "@/lib/types";
import toast from "react-hot-toast";

interface ClaimConfirmModalProps {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
}

export function ClaimConfirmModal({
  open,
  onClose,
  itemId,
  itemTitle,
}: ClaimConfirmModalProps) {
  const router = useRouter();
  const [preview, setPreview] = useState<ClaimPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open || !itemId) return;
    setPreview(null);
    setLoading(true);
    setSuccess(false);
    getClaimPreview(itemId)
      .then(setPreview)
      .catch(() => {
        toast.error("Could not load claim preview");
        onClose();
      })
      .finally(() => setLoading(false));
  }, [open, itemId, onClose]);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await submitClaim(itemId);
      setSuccess(true);
      toast.success("Your claim has been submitted!");
      setTimeout(() => {
        onClose();
        router.push("/feed");
      }, 1500);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? "Failed to submit claim";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Confirm Claim">
      <div className="space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          </div>
        )}

        {!loading && preview && !success && (
          <>
            <p className="text-sm text-gray-600">
              You are claiming <strong>{itemTitle}</strong> as yours.
            </p>

            {preview.bestMatch ? (
              <Card className="border-brand-200 bg-brand-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
                  Matched lost report
                </p>
                <div className="flex gap-3">
                  {preview.bestMatch.imageUrl && (
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={preview.bestMatch.imageUrl}
                        alt={preview.bestMatch.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {preview.bestMatch.title}
                    </p>
                    <p className="text-xs text-brand-700">
                      {Math.round(preview.bestMatch.similarityScore * 100)}% match
                    </p>
                  </div>
                </div>
              </Card>
            ) : null}

            {preview.warning === "no_report" && (
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
                <p className="text-sm text-amber-800">
                  You don&apos;t have an active lost item report. You can still claim — the finder
                  will be notified.
                </p>
              </div>
            )}

            {preview.warning === "low_similarity" && preview.bestMatch && (
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
                <p className="text-sm text-amber-800">
                  Your lost report has low similarity to this item. Only claim if you&apos;re sure
                  it&apos;s yours.
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirm}
                loading={submitting}
                disabled={submitting}
              >
                <Shield className="mr-2 h-4 w-4" />
                Confirm
              </Button>
            </div>
          </>
        )}

        {success && (
          <div className="py-6 text-center">
            <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-500" />
            <p className="font-semibold text-gray-900">Claim submitted!</p>
            <p className="text-sm text-gray-500">Redirecting to feed...</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
