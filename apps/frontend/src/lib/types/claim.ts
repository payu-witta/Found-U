import { z } from "zod";

export const ClaimStatus = z.enum(["pending", "verified", "rejected"]);
export type ClaimStatus = z.infer<typeof ClaimStatus>;

export const ClaimSchema = z.object({
  id: z.string().uuid(),
  item_id: z.string().uuid(),
  claimant_id: z.string().uuid(),
  status: ClaimStatus,
  verification_question: z.string().optional(),
  created_at: z.string().datetime(),
});

export type Claim = z.infer<typeof ClaimSchema>;

export interface CreateClaimPayload {
  item_id: string;
  message: string;
}

export interface VerifyClaimPayload {
  claim_id: string;
  answer: string;
}

export const VerificationResultSchema = z.object({
  claim_id: z.string().uuid(),
  status: ClaimStatus,
  verification_question: z.string().optional(),
  message: z.string().optional(),
});

export type VerificationResult = z.infer<typeof VerificationResultSchema>;

export interface ClaimPreviewResult {
  bestMatch: {
    lostItemId: string;
    title: string;
    imageUrl: string | null;
    similarityScore: number;
  } | null;
  hasLostReport: boolean;
  warning: "none" | "no_report" | "low_similarity" | null;
}

export interface SubmitClaimResult {
  claim: {
    id: string;
    itemId: string;
    claimantId: string;
    ownerId: string;
    similarityScore: number | null;
    status: string;
    createdAt: string;
  };
  matchInfo: ClaimPreviewResult["bestMatch"];
}
