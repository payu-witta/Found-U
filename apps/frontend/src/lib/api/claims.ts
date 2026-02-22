import { apiClient } from "./client";
import type {
  Claim,
  CreateClaimPayload,
  VerifyClaimPayload,
  VerificationResult,
  ClaimPreviewResult,
  SubmitClaimResult,
} from "@/lib/types";

/**
 * Backend expects: { itemId, verificationAnswer, notes } (camelCase).
 * Frontend sends: { item_id, message } — we map message → verificationAnswer.
 */
export async function createClaim(payload: CreateClaimPayload): Promise<Claim> {
  const raw = await apiClient<{
    id: string;
    itemId: string;
    claimantId: string;
    status: string;
    verificationQuestion: string | null;
    createdAt: string;
  }>("/claims/create", {
    method: "POST",
    body: {
      itemId: payload.item_id,
      verificationAnswer: payload.message,
      notes: payload.notes ?? undefined,
    },
  });
  return {
    id: raw.id,
    item_id: raw.itemId,
    claimant_id: raw.claimantId,
    status: raw.status as Claim["status"],
    verification_question: raw.verificationQuestion ?? undefined,
    created_at: raw.createdAt,
  };
}

/**
 * Backend verify is for ITEM OWNER (approve/reject), not claimant.
 * Backend expects: { claimId, action: 'approve' | 'reject' }.
 */
export async function verifyClaim(payload: VerifyClaimPayload): Promise<VerificationResult> {
  return apiClient<VerificationResult>("/claims/verify", {
    method: "POST",
    body: {
      claimId: payload.claim_id,
      action: payload.action,
    },
  });
}

export async function getClaimPreview(itemId: string): Promise<ClaimPreviewResult> {
  return apiClient<ClaimPreviewResult>(`/claims/${itemId}/preview`);
}

export async function submitClaim(itemId: string): Promise<SubmitClaimResult> {
  return apiClient<SubmitClaimResult>(`/claims/${itemId}`, {
    method: "POST",
  });
}

export interface ClaimStatusResult {
  id: string;
  status: string;
  title: string;
  message: string;
  contactEmail: string | null;
}

export async function getClaimStatus(claimId: string): Promise<ClaimStatusResult> {
  return apiClient<ClaimStatusResult>(`/claims/status/${claimId}`);
}
