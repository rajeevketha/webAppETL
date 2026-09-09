"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { isTestJob } from "@/components/TestResultPanel";
import { api } from "@/lib/api";
import type { JobErrorRecord, JobRecord } from "@/lib/types";

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<JobRecord | null>(null);
  const [errors, setErrors] = useState<JobErrorRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ job: JobRecord; errors: JobErrorRecord[] }>(`/api/jobs/${params.id}`)
      .then((data) => {
        setJob(data.job);
        setErrors(data.errors);
      })
      .catch((err: Error) => setError(err.message));
  }, [params.id]);

  if (!job) return <p className="text-ink-soft">{error || "Loading job…"}</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/jobs" className="text-sm text-forest">Job runs</Link>
        <h1 className="text-3xl mt-1 font-display">Run {job.id}</h1>
        <p className="text-ink-soft mt-2">{job.message || "No message."}</p>
        {job.message?.startsWith("Test") && (
          <p className="text-sm text-ink-soft mt-1">This was a test. Salesforce was not updated.</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={job.status} />
        <span className="text-sm text-ink-soft">{job.kind.replace("_", " ")}</span>
        {job.pipelineId && (
          <Link href={`/pipelines/${job.pipelineId}`} className="text-sm text-forest">Open pipeline</Link>
        )}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Extracted" value={job.extracted} />
        <Stat label="Loaded" value={job.loaded} />
        <Stat label="Failed" value={job.failed} />
        <Stat label="Skipped" value={job.skipped} />
      </div>
      <div className="bg-card border border-line rounded-xl p-5">
        <h2 className="text-lg mb-3">Row errors</h2>
        {!errors.length && <p className="text-sm text-ink-soft">No row-level errors.</p>}
        {errors.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-ink-soft">
              <tr>
                <th className="py-2">Row</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="py-2 mono text-xs">{item.rowIndex ?? "—"}</td>
                  <td>{item.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-line rounded-xl px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-ink-soft">{label}</div>
      <div className="font-display text-2xl mt-1">{value}</div>
    </div>
  );
}
