"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClaim, verifyClaim } from "@/lib/api/claims";
import type { CreateClaimPayload, VerifyClaimPayload } from "@/lib/types";

export function useCreateClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClaimPayload) => createClaim(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item"] });
    },
  });
}

export function useVerifyClaim() {
  return useMutation({
    mutationFn: (payload: VerifyClaimPayload) => verifyClaim(payload),
  });
}
