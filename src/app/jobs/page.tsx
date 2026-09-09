"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import type { JobRecord } from "@/lib/types";

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ jobs: JobRecord[] }>("/api/jobs")
      .then((data) => setJobs(data.jobs))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Job runs</h1>
        <p className="text-ink-soft mt-2">Every pipeline run and file import is recorded with extracted, loaded, and failed counts.</p>
      </div>
      {error && <p className="text-err text-sm">{error}</p>}
      <div className="bg-card border border-line rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-ink-soft bg-paper">
            <tr>
              <th className="px-4 py-3">Job</th>
              <th>Kind</th>
              <th>Status</th>
              <th>Extracted</th>
              <th>Loaded</th>
              <th>Failed</th>
              <th>Finished</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <Link href={`/jobs/${job.id}`} className="mono text-xs hover:underline">{job.id}</Link>
                  <div className="text-ink-soft text-xs mt-1">{job.message}</div>
                </td>
                <td>{job.message?.startsWith("Test") ? "test" : job.kind.replace("_", " ")}</td>
                <td><StatusBadge status={job.status} /></td>
                <td>{job.extracted}</td>
                <td>{job.loaded}</td>
                <td>{job.failed}</td>
                <td className="text-xs text-ink-soft">{job.finishedAt ? new Date(job.finishedAt).toLocaleString() : "—"}</td>
              </tr>
            ))}
            {!jobs.length && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-ink-soft">No jobs yet. Run a seeded pipeline from Overview.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
