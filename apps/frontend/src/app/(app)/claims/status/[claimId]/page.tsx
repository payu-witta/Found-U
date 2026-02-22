"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Shield, CheckCircle, Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getClaimStatus } from "@/lib/api/claims";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function ClaimStatusPage() {
  const { claimId } = useParams<{ claimId: string }>();
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ["claim-status", claimId],
    queryFn: () => getClaimStatus(claimId),
    enabled: !!claimId,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Claim not found or you don&apos;t have access to view it.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/feed")}
        >
          Back to Feed
        </Button>
      </div>
    );
  }

  const isApproved = data.status === "approved";

  return (
    <div className="mx-auto max-w-lg">
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-5 w-5 text-brand-600 dark:text-brand-400" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">
          Claim Status
        </h1>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900/50">
        {isApproved ? (
          <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-500" />
        ) : (
          <Shield className="h-12 w-12 text-brand-600 dark:text-brand-400" />
        )}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {data.title}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">{data.message}</p>
        {data.contactEmail && isApproved && (
          <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
            <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              Contact the finder
            </p>
            <a
              href={`mailto:${data.contactEmail}`}
              className="flex items-center gap-2 text-sm text-brand-600 hover:underline dark:text-brand-400"
            >
              <Mail className="h-4 w-4" />
              {data.contactEmail}
            </a>
          </div>
        )}
      </div>

      <Button
        variant="outline"
        className="mt-6 w-full"
        onClick={() => router.push("/feed")}
      >
        Back to Feed
      </Button>
    </div>
  );
}
