"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2, CheckCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { getClaimPreview, submitClaim } from "@/lib/api/claims";
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
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open || !itemId) return;
    setPreviewLoaded(false);
    setLoading(true);
    setSuccess(false);
    getClaimPreview(itemId)
      .then(() => setPreviewLoaded(true))
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

        {!loading && previewLoaded && !success && (
          <>
            <p className="text-sm text-gray-600">
              You are claiming <strong>{itemTitle}</strong> as yours. The finder will be notified.
            </p>
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
