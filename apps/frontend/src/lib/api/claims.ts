import { apiClient } from "./client";
import type {
  Claim,
  CreateClaimPayload,
  VerifyClaimPayload,
  VerificationResult,
  ClaimPreviewResult,
  SubmitClaimResult,
} from "@/lib/types";

export async function createClaim(payload: CreateClaimPayload): Promise<Claim> {
  return apiClient<Claim>("/claims/create", {
    method: "POST",
    body: payload,
  });
}

export async function verifyClaim(payload: VerifyClaimPayload): Promise<VerificationResult> {
  return apiClient<VerificationResult>("/claims/verify", {
    method: "POST",
    body: payload,
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
