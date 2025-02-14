import { apiRequest } from "./queryClient";
import type { ProcessingResult } from "@shared/schema";

export async function uploadCSV(file: File): Promise<ProcessingResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/process-csv', {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to upload file');
  }

  return response.json();
}

export function downloadProcessedCSV(url: string) {
  window.location.href = url;
}
