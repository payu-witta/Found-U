import { apiClient } from "./client";
import type { Claim, CreateClaimPayload, VerifyClaimPayload, VerificationResult } from "@/lib/types";

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
