import { apiClient } from "./client";

export interface UCardSubmitResult {
  recoveryId: string;
  extracted: boolean;
  matched: boolean;
  message: string;
}

export interface ReportLostResult {
  id: string;
  status: string;
}

export async function submitFoundUCard(
  image: File,
  note?: string
): Promise<UCardSubmitResult> {
  const formData = new FormData();
  formData.append("image", image);
  if (note) formData.append("note", note);
  return apiClient<UCardSubmitResult>("/ucard/submit", {
    method: "POST",
    body: formData,
  });
}

export async function reportLostUCard(spireId: string): Promise<ReportLostResult> {
  return apiClient<ReportLostResult>("/ucard/report-lost", {
    method: "POST",
    body: { spireId },
  });
}
