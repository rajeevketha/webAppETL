import type { JobStatus } from "@/lib/types";

export function formatLoadMessage(input: {
  dryRun: boolean;
  object: string;
  status: JobStatus;
  loaded: number;
  failed: number;
  detail?: string;
}) {
  if (input.dryRun) {
    if (input.detail) return `Test failed: ${input.detail} Nothing written to Salesforce.`;
    if (input.status === "success") {
      return `Test passed: ${input.loaded} ${input.object} rows would load. Nothing written to Salesforce.`;
    }
    return `Test: ${input.loaded} would load, ${input.failed} failed. Nothing written to Salesforce.`;
  }
  if (input.detail) return input.detail;
  if (input.status === "success") return `Loaded ${input.loaded} ${input.object} records.`;
  return `Loaded ${input.loaded}, failed ${input.failed}.`;
}
